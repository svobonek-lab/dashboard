-- STAGING-ONLY PROPOSAL — DO NOT APPLY TO PRODUCTION
--
-- This file is a review artifact for a disposable/staging Supabase project.
-- It intentionally does not match or alter historical legacy tables. Apply it
-- only after comparing the real staging schema and capturing policy/grant
-- evidence. Production remains read-only for this repository.

begin;

-- Public intake rate limiting is separated from business rows.
create table if not exists public.app_public_intake_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  request_key text not null,
  created_at timestamptz not null default now(),
  unique (company_id, request_key)
);
alter table public.app_public_intake_events enable row level security;
revoke all on public.app_public_intake_events from anon, authenticated;

-- Tenant read/write policies. Every write keeps the company_id in the row and
-- checks the authenticated membership again in WITH CHECK.
alter table public.app_companies enable row level security;
alter table public.app_members enable row level security;
alter table public.app_invites enable row level security;
alter table public.app_leads enable row level security;

drop policy if exists app_companies_select_member on public.app_companies;
create policy app_companies_select_member on public.app_companies
  for select to authenticated
  using (public.app_role(id) is not null);

drop policy if exists app_companies_update_owner on public.app_companies;
create policy app_companies_update_owner on public.app_companies
  for update to authenticated
  using (public.app_role(id) = 'owner')
  with check (public.app_role(id) = 'owner');

drop policy if exists app_members_select_member on public.app_members;
create policy app_members_select_member on public.app_members
  for select to authenticated
  using (public.app_role(company_id) is not null);

drop policy if exists app_members_owner_write on public.app_members;
create policy app_members_owner_write on public.app_members
  for all to authenticated
  using (public.app_role(company_id) = 'owner')
  with check (public.app_role(company_id) = 'owner');

drop policy if exists app_invites_owner_read on public.app_invites;
create policy app_invites_owner_read on public.app_invites
  for select to authenticated
  using (public.app_role(company_id) = 'owner');

drop policy if exists app_invites_owner_write on public.app_invites;
create policy app_invites_owner_write on public.app_invites
  for all to authenticated
  using (public.app_role(company_id) = 'owner')
  with check (public.app_role(company_id) = 'owner');

drop policy if exists app_leads_select_scoped on public.app_leads;
create policy app_leads_select_scoped on public.app_leads
  for select to authenticated
  using (
    public.app_role(company_id) = 'owner'
    or public.app_can_lead(company_id, id)
  );

drop policy if exists app_leads_insert_owner on public.app_leads;
create policy app_leads_insert_owner on public.app_leads
  for insert to authenticated
  with check (public.app_role(company_id) = 'owner');

drop policy if exists app_leads_update_scoped on public.app_leads;
create policy app_leads_update_scoped on public.app_leads
  for update to authenticated
  using (
    public.app_role(company_id) = 'owner'
    or public.app_can_lead(company_id, id)
  )
  with check (
    company_id = app_leads.company_id
    and (
      public.app_role(company_id) = 'owner'
      or public.app_can_lead(company_id, id)
    )
  );

-- Service boundary for creating a company and its first owner. The caller is
-- the server-side onboarding worker, never a browser or the authenticated role.
create or replace function public.app_provision_company(
  p_name text,
  p_slug text,
  p_owner_user_id uuid,
  p_owner_email text,
  p_owner_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_company_id uuid;
begin
  if nullif(trim(p_name), '') is null or nullif(trim(p_slug), '') is null then
    raise exception 'company name and slug are required';
  end if;
  insert into public.app_companies (name, slug)
  values (substr(trim(p_name), 1, 160), lower(substr(trim(p_slug), 1, 80)))
  returning id into v_company_id;
  insert into public.app_members (company_id, user_id, name, email, role, active)
  values (v_company_id, p_owner_user_id, substr(trim(p_owner_name), 1, 160), lower(trim(p_owner_email)), 'owner', true);
  return v_company_id;
end;
$$;
revoke all on function public.app_provision_company(text, text, uuid, text, text) from public, anon, authenticated;
grant execute on function public.app_provision_company(text, text, uuid, text, text) to service_role;

-- Owner-only invitation record. Auth email delivery/activation remains a
-- separate reviewed Supabase Auth recovery flow; this function does not emit a
-- raw token or create an auth user.
create or replace function public.app_create_invite(
  p_company_id uuid,
  p_email text,
  p_name text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if public.app_role(p_company_id) <> 'owner' then
    raise exception 'owner membership required';
  end if;
  insert into public.app_invites (company_id, email, name, role, expires_at)
  values (p_company_id, lower(trim(p_email)), substr(trim(p_name), 1, 160), 'employee', now() + interval '7 days')
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.app_create_invite(uuid, text, text) from public, anon;
grant execute on function public.app_create_invite(uuid, text, text) to authenticated;

-- Public branding lookup exposes only fields needed by the embedded form. The
-- URL may carry either the tenant slug or UUID; neither value grants row access.
create or replace function public.app_get_public_company(p_public_key text)
returns jsonb
language sql
security definer
set search_path = public, pg_temp
as $$
  select case when c.id is null then null else jsonb_build_object(
    'id', c.id,
    'name', c.name,
    'color', c.color,
    'logo_url', c.logo_url,
    'active', c.active,
    'public_form', c.public_form
  ) end
  from public.app_companies c
  where c.active = true
    and c.public_form = true
    and (c.slug = lower(trim(p_public_key)) or c.id::text = trim(p_public_key))
  limit 1
$$;
revoke all on function public.app_get_public_company(text) from public, authenticated;
grant execute on function public.app_get_public_company(text) to anon;

-- Public form intake. The public_form switch is the tenant-safe public key
-- boundary; the caller receives only the generated lead id.
create or replace function public.app_submit_public_lead(
  p_company_id uuid,
  p_request_key text,
  p_customer text,
  p_phone text,
  p_email text,
  p_title text,
  p_description text,
  p_value numeric
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if nullif(trim(p_request_key), '') is null then
    raise exception 'request key is required';
  end if;
  if not exists (select 1 from public.app_companies where id = p_company_id and active and public_form) then
    raise exception 'public form is not active for this company';
  end if;
  insert into public.app_public_intake_events (company_id, request_key)
  values (p_company_id, substr(trim(p_request_key), 1, 120))
  on conflict (company_id, request_key) do nothing;
  if not found then
    select id into v_id from public.app_leads
    where company_id = p_company_id and source = 'public_form'
      and description = 'request_key:' || substr(trim(p_request_key), 1, 120)
    order by created_at desc limit 1;
    return v_id;
  end if;
  insert into public.app_leads (company_id, title, customer, email, phone, description, value, source)
  values (
    p_company_id,
    substr(trim(coalesce(p_title, 'Nová poptávka')), 1, 160),
    substr(trim(coalesce(p_customer, 'Zájemce')), 1, 160),
    substr(trim(coalesce(p_email, '')), 1, 160),
    substr(trim(coalesce(p_phone, '')), 1, 60),
    'request_key:' || substr(trim(p_request_key), 1, 120) || E'\n' || substr(trim(coalesce(p_description, '')), 1, 4000),
    greatest(coalesce(p_value, 0), 0),
    'public_form'
  ) returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.app_submit_public_lead(uuid, text, text, text, text, text, text, numeric) from public, authenticated;
grant execute on function public.app_submit_public_lead(uuid, text, text, text, text, text, text, numeric) to anon;

-- Import jobs are service-only. The browser can preview CSV, but only a
-- reviewed server worker may write imported rows and record provenance.
create or replace function public.app_import_leads(
  p_company_id uuid,
  p_rows jsonb,
  p_file_name text,
  p_fingerprint text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if jsonb_typeof(p_rows) <> 'array' or jsonb_array_length(p_rows) > 10000 then
    raise exception 'import must be an array with at most 10000 rows';
  end if;
  -- Implementation is intentionally completed in the staging job after the
  -- app_imports schema and idempotency policy are reviewed.
  raise exception 'staging import worker contract pending review';
end;
$$;
revoke all on function public.app_import_leads(uuid, jsonb, text, text) from public, anon, authenticated;
grant execute on function public.app_import_leads(uuid, jsonb, text, text) to service_role;

commit;
