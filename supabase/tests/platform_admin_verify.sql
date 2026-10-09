\set ON_ERROR_STOP on

insert into public.app_platform_admins(user_id, notes)
values ('90000000-0000-4000-8000-000000000009', 'synthetic CI administrator');

do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'app_platform_support_sessions'
      and c.relrowsecurity and c.relforcerowsecurity
  ) then raise exception 'support sessions must force RLS'; end if;
  if has_function_privilege('anon', 'public.app_platform_support_workspace(uuid,uuid)', 'execute')
    or has_function_privilege('authenticated', 'public.app_platform_support_workspace(uuid,uuid)', 'execute')
    or has_function_privilege('anon', 'public.app_platform_support_mutate_lead(uuid,uuid,text,uuid,jsonb,text)', 'execute')
    or has_function_privilege('authenticated', 'public.app_platform_support_mutate_lead(uuid,uuid,text,uuid,jsonb,text)', 'execute')
  then raise exception 'browser roles must not execute support RPCs'; end if;
  if not has_function_privilege('service_role', 'public.app_platform_support_workspace(uuid,uuid)', 'execute')
    or not has_function_privilege('service_role', 'public.app_platform_support_mutate_lead(uuid,uuid,text,uuid,jsonb,text)', 'execute')
  then raise exception 'service role support grants are missing'; end if;
  if exists (
    select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('app_platform_create_support_session','app_platform_get_support_session','app_platform_support_workspace','app_platform_support_mutate_lead')
      and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path=""%'
  ) then raise exception 'support security definer search_path must be empty'; end if;
end;
$$;

set role service_role;
select id as support_session_id
from public.app_platform_create_support_session(
  '90000000-0000-4000-8000-000000000009',
  '10000000-0000-4000-8000-000000000001',
  'Synthetic CI support acceptance'
) \gset
reset role;
create temporary table platform_test_session(id uuid primary key);
insert into platform_test_session values (:'support_session_id'::uuid);
set role service_role;

select access_mode = 'full_support' as support_is_full
from public.app_platform_get_support_session(
  '90000000-0000-4000-8000-000000000009', :'support_session_id'::uuid
) \gset
\if :support_is_full
\else
  \quit 1
\endif

select public.app_platform_support_workspace(
  '90000000-0000-4000-8000-000000000009', :'support_session_id'::uuid
) as workspace \gset
select (:'workspace'::jsonb->'company'->>'id') = '10000000-0000-4000-8000-000000000001'
  and jsonb_array_length(:'workspace'::jsonb->'leads') = 1
  and (:'workspace'::jsonb->'leads'->0->>'company_id') = '10000000-0000-4000-8000-000000000001'
  as workspace_is_tenant_scoped \gset
\if :workspace_is_tenant_scoped
\else
  \quit 1
\endif

select public.app_platform_support_mutate_lead(
  '90000000-0000-4000-8000-000000000009', :'support_session_id'::uuid,
  'create_lead', null, '{"title":"CI lead","customer":"CI customer"}'::jsonb, 'ci-create-0001'
)->>'id' as created_lead_id \gset
select public.app_platform_support_mutate_lead(
  '90000000-0000-4000-8000-000000000009', :'support_session_id'::uuid,
  'create_lead', null, '{"title":"duplicate","customer":"duplicate"}'::jsonb, 'ci-create-0001'
)->>'id' = :'created_lead_id' as create_is_idempotent \gset
\if :create_is_idempotent
\else
  \quit 1
\endif

select public.app_platform_support_mutate_lead(
  '90000000-0000-4000-8000-000000000009', :'support_session_id'::uuid,
  'update_status', :'created_lead_id'::uuid, '{"status":"contacted"}'::jsonb, 'ci-status-0001'
)->>'status' = 'contacted' as status_was_persisted \gset
\if :status_was_persisted
\else
  \quit 1
\endif

reset role;
do $$
declare v_session uuid := (select id from platform_test_session);
begin
  begin
    perform public.app_platform_support_workspace('91000000-0000-4000-8000-000000000019', v_session);
    raise exception 'another actor must not reuse the support session';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.app_platform_support_mutate_lead(
      '90000000-0000-4000-8000-000000000009', v_session,
      'update_status', 'b0000000-0000-4000-8000-000000000002', '{"status":"contacted"}', 'ci-cross-0001'
    );
    raise exception 'support session must not mutate another company';
  exception when insufficient_privilege then null;
  end;
end;
$$;

do $$
begin
  if (select count(*) from public.app_leads where title = 'CI lead' and company_id = '10000000-0000-4000-8000-000000000001') <> 1
    or (select status from public.app_leads where id = 'b0000000-0000-4000-8000-000000000002') <> 'new'
  then raise exception 'support mutation escaped tenant or lost idempotency'; end if;
  if (select count(*) from public.app_platform_audit_events where support_session_id = (select id from platform_test_session) and action like 'support.%') <> 2
  then raise exception 'each unique support mutation must be audited once'; end if;
end;
$$;
