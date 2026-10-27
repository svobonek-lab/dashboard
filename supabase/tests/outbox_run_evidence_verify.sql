\set ON_ERROR_STOP on

do $$
begin
  if not (select relrowsecurity from pg_class where oid = 'public.app_email_outbox_runs'::regclass) then
    raise exception 'run evidence must use RLS';
  end if;
  if has_table_privilege('anon', 'public.app_email_outbox_runs', 'select,insert,update,delete')
     or has_table_privilege('authenticated', 'public.app_email_outbox_runs', 'select,insert,update,delete') then
    raise exception 'browser roles must not access run evidence';
  end if;
  if not has_table_privilege('service_role', 'public.app_email_outbox_runs', 'select,insert,update') then
    raise exception 'service role needs bounded worker access';
  end if;
  if exists (
    select 1 from information_schema.columns
    where table_schema='public' and table_name='app_email_outbox_runs'
      and column_name = any(array['recipient','email','subject','body','provider_message_id','customer_id','company_id'])
  ) then raise exception 'run evidence must not store customer or tenant data'; end if;
end;
$$;

set role authenticated;
do $$
begin
  begin
    insert into public.app_email_outbox_runs(status,started_at) values ('running',now());
    raise exception 'authenticated role unexpectedly inserted run evidence';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;
reset role;

set role service_role;
insert into public.app_email_outbox_runs(status,started_at)
values ('running', '2026-10-26T10:00:00Z') returning id \gset
update public.app_email_outbox_runs
set status='success', completed_at='2026-10-26T10:01:00Z', selected_count=1, delivered_count=1
where id = :'id';
reset role;

do $$
begin
  if not exists (
    select 1 from public.app_email_outbox_runs
    where started_at='2026-10-26T10:00:00Z' and status='success'
      and completed_at='2026-10-26T10:01:00Z' and selected_count=1 and delivered_count=1
  ) then raise exception 'worker must persist start and completion evidence'; end if;
end;
$$;
