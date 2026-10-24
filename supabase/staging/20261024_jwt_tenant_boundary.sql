-- STAGING-ONLY PROPOSAL. Review before manual application.
-- Requires reviewed app_* contracts and app_private.app_role/app_can_lead.
-- Release gate: configure a trusted Auth hook that puts the selected company UUID
-- in app_metadata.tenant_id. user_metadata is never an authorization source.
-- Missing/invalid claims deny access; do not activate before hook acceptance tests.
begin;

create or replace function app_private.jwt_tenant_id()
returns uuid language plpgsql stable security invoker set search_path = ''
as $$
declare v text := auth.jwt() -> 'app_metadata' ->> 'tenant_id';
begin
  if v is null or v !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then return null; end if;
  return v::uuid;
end;
$$;
revoke all on function app_private.jwt_tenant_id() from public, anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.jwt_tenant_id() to authenticated;

-- RESTRICTIVE policies are AND-ed with all existing permissive policies.
-- Changing a URL/body row ID cannot cross this JWT boundary (IDOR protection).
-- Live membership is rechecked so revocation works before JWT expiry.
do $$
declare t record; k text;
begin
  for t in
    select tablename from pg_tables
    where schemaname = 'public' and tablename in (
      'app_companies','app_members','app_leads','app_projects','app_tasks',
      'app_quotes','app_lead_notes','app_lead_files','app_lead_events','app_invites'
    )
  loop
    k := case when t.tablename = 'app_companies' then 'id' else 'company_id' end;
    if not exists (select 1 from information_schema.columns c
      where c.table_schema='public' and c.table_name=t.tablename and c.column_name=k) then
      raise exception 'Missing tenant column on %', t.tablename;
    end if;
    execute format('alter table public.%I enable row level security', t.tablename);
    execute format('drop policy if exists app_jwt_tenant_boundary on public.%I', t.tablename);
    execute format(
      'create policy app_jwt_tenant_boundary on public.%I as restrictive for all to authenticated
       using (%I = (select app_private.jwt_tenant_id()) and app_private.app_role(%I) is not null)
       with check (%I = (select app_private.jwt_tenant_id()) and app_private.app_role(%I) is not null)',
       t.tablename,k,k,k,k);
  end loop;
end;
$$;

-- A creator is immutable server-owned evidence, not a browser-selected user ID.
alter table public.app_leads add column if not exists created_by uuid references auth.users(id);
create or replace function app_private.guard_lead_creator()
returns trigger language plpgsql security invoker set search_path = ''
as $$
begin
  if TG_OP = 'INSERT' then
    if auth.uid() is not null then new.created_by := auth.uid(); end if;
  elsif new.created_by is distinct from old.created_by then
    raise exception 'lead creator is immutable' using errcode='42501';
  end if;
  return new;
end;
$$;
revoke all on function app_private.guard_lead_creator() from public, anon, authenticated;
drop trigger if exists app_guard_lead_creator on public.app_leads;
create trigger app_guard_lead_creator before insert or update on public.app_leads
for each row execute function app_private.guard_lead_creator();

-- Existing assignment and field-mutation policies remain in effect.
-- DELETE additionally requires the original creator for employees. Legacy rows
-- with unknown creator are owner-only; never guess authorship during backfill.
drop policy if exists app_leads_delete_creator on public.app_leads;
create policy app_leads_delete_creator on public.app_leads for delete to authenticated
using (app_private.app_role(company_id) = 'owner'
  or (app_private.app_role(company_id) = 'employee' and created_by = auth.uid()
    and app_private.app_can_lead(company_id,id)));
drop policy if exists app_leads_delete_creator_boundary on public.app_leads;
create policy app_leads_delete_creator_boundary on public.app_leads as restrictive for delete to authenticated
using (app_private.app_role(company_id) = 'owner'
  or (created_by = auth.uid() and app_private.app_can_lead(company_id,id)));

-- Employee UPDATE is still limited by guard_lead_mutation. Lead DELETE is explicitly
-- granted below, bounded by both restrictive tenant and creator policies.
-- Notes/files keep their stricter existing 15-minute creator delete window.
-- Service-only provisioning/public intake use separately reviewed server RPCs.
commit;
-- Auth hook. Configure this explicitly in Supabase Auth only after acceptance.
-- Selected tenant is derived from live membership, never client user_metadata.
-- Ambiguous membership yields no tenant claim (fail closed).
begin;
create or replace function public.app_tenant_access_token_hook(event jsonb)
returns jsonb language plpgsql stable security definer set search_path = ''
as $$
declare v_tenant uuid; v_count bigint; v_claims jsonb;
begin
  select count(*), min(m.company_id::text)::uuid into v_count,v_tenant
  from public.app_members m
  join public.app_companies c on c.id=m.company_id and c.active
  where m.user_id=(event->>'user_id')::uuid and m.active
    and m.role in ('owner','employee');
  v_claims := coalesce(event->'claims','{}'::jsonb);
  -- Remove stale claims even when an account no longer has a tenant.
  v_claims := jsonb_set(v_claims, '{app_metadata}',
    coalesce(v_claims->'app_metadata','{}'::jsonb) - 'tenant_id');
  if v_count=1 then
    v_claims := jsonb_set(v_claims,'{app_metadata,tenant_id}',to_jsonb(v_tenant::text));
  end if;
  return jsonb_set(event,'{claims}',v_claims);
end;
$$;
revoke all on function public.app_tenant_access_token_hook(jsonb) from public,anon,authenticated,service_role;
grant execute on function public.app_tenant_access_token_hook(jsonb) to supabase_auth_admin;
commit;

begin;
-- Table privileges and RLS are both required. DELETE stays restricted by the
-- tenant boundary AND the immutable creator/assignment policy above.
grant delete on public.app_leads to authenticated;

-- Storage is a separate authorization surface: an authorized object-path request
-- must match the same trusted JWT tenant, not merely a membership in another firm.
-- Existing bucket/path/assignment/delete-window policies remain necessary.
do $$
begin
 if to_regclass('storage.objects') is not null then
  execute 'drop policy if exists app_lead_files_jwt_boundary on storage.objects';
  execute $policy$
    create policy app_lead_files_jwt_boundary on storage.objects as restrictive for all to authenticated
    using (bucket_id <> 'lead-files' or (
      split_part(name,'/',1) = (select app_private.jwt_tenant_id())::text
      and app_private.app_role((select app_private.jwt_tenant_id())) is not null))
    with check (bucket_id <> 'lead-files' or (
      split_part(name,'/',1) = (select app_private.jwt_tenant_id())::text
      and app_private.app_role((select app_private.jwt_tenant_id())) is not null))
  $policy$;
  execute 'drop policy if exists app_lead_files_anon_boundary on storage.objects';
  execute $policy$
    create policy app_lead_files_anon_boundary on storage.objects as restrictive for all to anon
    using (bucket_id <> 'lead-files') with check (bucket_id <> 'lead-files')
  $policy$;
 end if;
end $$;
commit;
