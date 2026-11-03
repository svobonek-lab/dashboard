\set ON_ERROR_STOP on

do $$
declare
  queued public.app_email_outbox%rowtype;
  sent public.app_email_outbox%rowtype;
begin
  if not (select relrowsecurity from pg_class where oid = 'public.app_email_outbox'::regclass) then
    raise exception 'compatibility migration must preserve RLS';
  end if;
  if not has_table_privilege('authenticated', 'public.app_email_outbox', 'select')
     or has_table_privilege('authenticated', 'public.app_email_outbox', 'insert')
     or has_table_privilege('authenticated', 'public.app_email_outbox', 'update')
     or has_table_privilege('authenticated', 'public.app_email_outbox', 'delete') then
    raise exception 'compatibility migration must preserve authenticated read-only grants';
  end if;
  if not has_table_privilege('service_role', 'public.app_email_outbox', 'select')
     or not has_table_privilege('service_role', 'public.app_email_outbox', 'insert')
     or not has_table_privilege('service_role', 'public.app_email_outbox', 'update') then
    raise exception 'compatibility migration must preserve service worker grants';
  end if;
  if not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'app_email_outbox_worker_pending_idx')
     or not exists (select 1 from pg_indexes where schemaname = 'public' and indexname = 'app_email_outbox_worker_stale_idx') then
    raise exception 'worker queue and lease indexes are required';
  end if;

  select * into queued from public.app_email_outbox where id = '10000000-0000-4000-8000-000000000001';
  if queued.body_html <> '<p>queued</p>' or queued.body <> '' or queued.updated_at is null then
    raise exception 'existing queued content or claim timestamp was not preserved';
  end if;
  select * into sent from public.app_email_outbox where id = '10000000-0000-4000-8000-000000000002';
  if sent.status <> 'sent' or sent.provider_message_id <> 'provider-fixture-id'
     or sent.delivered_at <> '2026-11-03T10:01:00Z' or sent.html <> '<p>sent</p>' then
    raise exception 'existing delivered record was not preserved and mapped';
  end if;
end;
$$;

insert into public.app_email_outbox(id, company_id, recipient, subject, status)
select ('20000000-0000-4000-8000-' || lpad(n::text, 12, '0'))::uuid,
       '30000000-0000-4000-8000-000000000001', 'worker@example.test', 'status fixture', status
from unnest(array['pending', 'sending', 'sent', 'failed', 'cancelled', 'processing', 'delivered', 'retry'])
  with ordinality as statuses(status, n);

do $$
begin
  if (select count(*) from public.app_email_outbox where subject = 'status fixture') <> 8 then
    raise exception 'new worker statuses must be accepted while all legacy statuses remain valid';
  end if;
end;
$$;
