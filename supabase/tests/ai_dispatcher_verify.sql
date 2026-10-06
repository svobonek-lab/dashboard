\set ON_ERROR_STOP on

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'app_ai_inbox_events' and c.relrowsecurity
  ) then raise exception 'app_ai_inbox_events must have RLS enabled'; end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'app_email_outbox' and c.relrowsecurity
  ) then raise exception 'app_email_outbox must have RLS enabled'; end if;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'app_dead_lead_notifications' and c.relrowsecurity
  ) then raise exception 'app_dead_lead_notifications must have RLS enabled'; end if;

  if has_table_privilege('anon', 'public.app_ai_inbox_events', 'select')
    or has_table_privilege('authenticated', 'public.app_ai_inbox_events', 'select')
    or has_table_privilege('anon', 'public.app_email_outbox', 'select')
    or has_table_privilege('authenticated', 'public.app_email_outbox', 'select')
  then raise exception 'browser roles must not read service-only tables'; end if;

  if has_function_privilege('anon', 'public.app_submit_ai_inbox_lead(uuid,text,text,text,text,text,text)', 'execute')
    or has_function_privilege('authenticated', 'public.app_submit_ai_inbox_lead(uuid,text,text,text,text,text,text)', 'execute')
    or has_function_privilege('anon', 'public.app_queue_stale_lead_alerts(text)', 'execute')
    or has_function_privilege('authenticated', 'public.app_queue_stale_lead_alerts(text)', 'execute')
  then raise exception 'browser roles must not execute service-only RPCs'; end if;

  if not has_function_privilege('service_role', 'public.app_submit_ai_inbox_lead(uuid,text,text,text,text,text,text)', 'execute')
    or not has_function_privilege('service_role', 'public.app_queue_stale_lead_alerts(text)', 'execute')
    or not has_function_privilege('anon', 'public.app_submit_public_lead(text,text,text,text,text,text,text,numeric)', 'execute')
  then raise exception 'required RPC grant is missing'; end if;

  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('app_submit_ai_inbox_lead', 'app_submit_public_lead', 'app_queue_stale_lead_alerts')
      and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=""%'
  ) then raise exception 'security definer search_path must be empty'; end if;
end;
$$;

set role anon;
select public.app_submit_public_lead(
  'firma-a', 'widget-request-1', 'Web zákazník', '123', 'web@example.invalid',
  'Rekonstrukce', 'Prosím o nabídku', 100
) as widget_lead_id \gset
select public.app_submit_public_lead(
  'firma-a', 'widget-request-1', 'Změněné jméno', '999', '',
  'Jiný titul', 'Duplicitní požadavek', 999
) = :'widget_lead_id'::uuid as widget_is_idempotent \gset
\if :widget_is_idempotent
\else
  \quit 1
\endif
reset role;

create temporary table ai_dispatcher_test_ids(name text primary key, id uuid not null);
insert into ai_dispatcher_test_ids values ('widget', :'widget_lead_id'::uuid);

set role service_role;
select public.app_submit_ai_inbox_lead(
  '20000000-0000-4000-8000-000000000002', 'mail-request-1', 'AI zákazník',
  '456', 'Nová střecha', 'Poptávka střechy', 'Brno'
) as ai_lead_id \gset
select public.app_submit_ai_inbox_lead(
  '20000000-0000-4000-8000-000000000002', 'mail-request-1', 'Jiné jméno',
  '000', 'Jiný titul', 'Duplicitní e-mail', 'Praha'
) = :'ai_lead_id'::uuid as ai_is_idempotent \gset
\if :ai_is_idempotent
\else
  \quit 1
\endif
reset role;

insert into ai_dispatcher_test_ids values ('ai', :'ai_lead_id'::uuid);

do $$
begin
  if (select count(*) from public.app_leads where source = 'widget') <> 1 then
    raise exception 'widget must create exactly one lead';
  end if;
  if (select count(*) from public.app_leads where source = 'ai_inbox') <> 1 then
    raise exception 'AI inbox must create exactly one lead';
  end if;
  if exists (
    select 1 from public.app_leads
    where id = (select id from ai_dispatcher_test_ids where name = 'widget')
      and company_id <> '10000000-0000-4000-8000-000000000001'::uuid
  ) then raise exception 'widget lead escaped its company'; end if;
  if exists (
    select 1 from public.app_leads
    where id = (select id from ai_dispatcher_test_ids where name = 'ai')
      and company_id <> '20000000-0000-4000-8000-000000000002'::uuid
  ) then raise exception 'AI lead escaped its company'; end if;
end;
$$;

update public.app_leads set created_at = now() - interval '25 hours'
where id = (select id from ai_dispatcher_test_ids where name = 'ai');

set role service_role;
select public.app_queue_stale_lead_alerts('24 hours') = 1 as first_alert_queued \gset
select public.app_queue_stale_lead_alerts('24 hours') = 0 as duplicate_alert_skipped \gset
reset role;

\if :first_alert_queued
\else
  \quit 1
\endif
\if :duplicate_alert_skipped
\else
  \quit 1
\endif

do $$
begin
  if (select count(*) from public.app_dead_lead_notifications
      where lead_id = (select id from ai_dispatcher_test_ids where name = 'ai')) <> 1 then
    raise exception 'stale lead notification must be unique';
  end if;
  if (select count(*) from public.app_email_outbox where company_id = '20000000-0000-4000-8000-000000000002') <> 1 then
    raise exception 'stale lead must queue exactly one owner e-mail';
  end if;
end;
$$;
