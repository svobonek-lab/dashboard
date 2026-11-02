-- Disposable fixture for the employee seat-limit contract. No live database
-- is read or written by this setup.
\set ON_ERROR_STOP on

create extension if not exists pgcrypto;

do $$ begin create role anon nologin; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated nologin; exception when duplicate_object then null; end $$;
do $$ begin create role service_role nologin bypassrls; exception when duplicate_object then null; end $$;

create schema if not exists auth;
create schema if not exists app_private;

create table auth.users (
  id uuid primary key,
  email text not null unique,
  email_confirmed_at timestamptz,
  raw_app_meta_data jsonb not null default '{}'::jsonb
);

create or replace function auth.uid()
returns uuid
language sql stable
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table public.app_companies (
  id uuid primary key,
  name text not null,
  plan text not null default 'pilot',
  active boolean not null default true
);

create table public.app_members (
  company_id uuid not null references public.app_companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('owner', 'employee')),
  active boolean not null default true,
  primary key (company_id, user_id)
);

create table public.app_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  email text not null,
  name text not null,
  role text not null check (role in ('owner', 'employee')),
  expires_at timestamptz not null,
  accepted_at timestamptz,
  accepted_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.app_company_legal_acceptances (
  company_id uuid not null,
  invite_id uuid not null,
  actor_user_id uuid not null,
  capture_source text not null,
  agreement text not null
);

create table public.app_platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  company_id uuid,
  target_id uuid,
  outcome text not null,
  reason_code text not null,
  created_at timestamptz not null default now()
);

create or replace function public.app_role(p_company_id uuid)
returns text
language sql stable security definer set search_path = ''
as $$
  select m.role from public.app_members m
  where m.company_id = p_company_id and m.user_id = auth.uid() and m.active
  order by case m.role when 'owner' then 0 else 1 end limit 1
$$;

-- Match the current staging acceptance body. The seat-limit migration must
-- preserve its authentication, email, password, owner/legal, and audit rules.
create or replace function app_private.accept_invite(p_invite_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_invite public.app_invites;
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
  v_password_was_set boolean;
begin
  if v_user_id is null then raise exception 'authenticated user required' using errcode = '42501'; end if;
  select lower(u.email), u.email_confirmed_at,
    coalesce((u.raw_app_meta_data ->> 'invite_password_set')::boolean, false)
  into strict v_email, v_email_confirmed_at, v_password_was_set
  from auth.users u where u.id = v_user_id;
  if v_email_confirmed_at is null then raise exception 'verified email required' using errcode = '42501'; end if;
  if not v_password_was_set then raise exception 'password setup required' using errcode = '42501'; end if;

  select * into v_invite from public.app_invites i where i.id = p_invite_id for update;
  if not found or v_invite.accepted_at is not null or v_invite.revoked_at is not null
    or v_invite.expires_at <= clock_timestamp() or lower(v_invite.email) is distinct from v_email
    or v_invite.role not in ('owner', 'employee') then
    raise exception 'invitation is invalid, expired, used, or belongs to another account' using errcode = '42501';
  end if;
  if not exists (select 1 from public.app_companies c where c.id = v_invite.company_id and c.active) then
    raise exception 'company is not active' using errcode = '42501';
  end if;
  if v_invite.role = 'owner' and not exists (
    select 1 from public.app_company_legal_acceptances a
    where a.company_id = v_invite.company_id and a.invite_id = v_invite.id and a.actor_user_id = v_user_id
      and a.capture_source = 'owner_invite_activation' and a.agreement = 'terms_of_service'
  ) then raise exception 'owner legal consent required' using errcode = '42501'; end if;
  if v_invite.role = 'owner' and not exists (
    select 1 from public.app_company_legal_acceptances a
    where a.company_id = v_invite.company_id and a.invite_id = v_invite.id and a.actor_user_id = v_user_id
      and a.capture_source = 'owner_invite_activation' and a.agreement = 'data_processing_agreement'
  ) then raise exception 'owner data-processing agreement required' using errcode = '42501'; end if;
  if v_invite.role = 'owner' and exists (
    select 1 from public.app_members m where m.company_id = v_invite.company_id and m.role = 'owner' and m.active
  ) then raise exception 'company already has an active owner' using errcode = '42501'; end if;

  insert into public.app_members(company_id, user_id, name, email, role, active)
  values(v_invite.company_id, v_user_id, v_invite.name, v_email, v_invite.role, true)
  on conflict(company_id, user_id) do update set name = excluded.name, email = excluded.email, role = excluded.role, active = true;
  update public.app_invites set accepted_at = clock_timestamp(), accepted_by = v_user_id where id = v_invite.id;
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, target_id, outcome, reason_code)
  values(v_user_id, 'company_invite.accepted', v_invite.company_id, v_invite.id, 'allowed', 'verified_invitation_with_password_and_legal_consent');
  return jsonb_build_object('companyId', v_invite.company_id, 'userId', v_user_id, 'role', v_invite.role);
end;
$$;

create or replace function public.app_accept_invite(p_invite_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select app_private.accept_invite(p_invite_id) $$;

create or replace function public.app_create_invite(p_company_id uuid, p_email text, p_name text)
returns uuid language plpgsql security invoker set search_path = public, pg_temp
as $$
declare v_id uuid; v_email text := lower(trim(p_email));
begin
  if auth.uid() is null or public.app_role(p_company_id) is distinct from 'owner' then
    raise exception 'owner membership required' using errcode = '42501';
  end if;
  if nullif(v_email, '') is null then raise exception 'email required'; end if;
  update public.app_invites set expires_at = now() - interval '1 second'
  where company_id = p_company_id and lower(email) = v_email and accepted_at is null and expires_at > now();
  insert into public.app_invites(company_id, email, name, role, expires_at)
  values(p_company_id, v_email, substr(trim(p_name), 1, 160), 'employee', now() + interval '7 days')
  returning id into v_id;
  return v_id;
end
$$;

insert into public.app_companies(id, name, plan) values
  ('11000000-0000-4000-8000-000000000001', 'Synthetic tenant A', 'pilot'),
  ('22000000-0000-4000-8000-000000000002', 'Synthetic tenant B', 'growth'),
  ('33000000-0000-4000-8000-000000000003', 'Synthetic tenant Pro', 'pro'),
  ('44000000-0000-4000-8000-000000000004', 'Synthetic legacy tenant', 'business');

insert into auth.users(id, email, email_confirmed_at, raw_app_meta_data) values
  ('10000000-0000-4000-8000-000000000001', 'owner-a@example.invalid', now(), '{"invite_password_set":true}'),
  ('20000000-0000-4000-8000-000000000001', 'owner-b@example.invalid', now(), '{"invite_password_set":true}'),
  ('30000000-0000-4000-8000-000000000001', 'owner-pro@example.invalid', now(), '{"invite_password_set":true}'),
  ('30000000-0000-4000-8000-000000000002', 'pro-accept@example.invalid', now(), '{"invite_password_set":true}'),
  ('40000000-0000-4000-8000-000000000001', 'owner-legacy@example.invalid', now(), '{"invite_password_set":true}'),
  ('50000000-0000-4000-8000-000000000001', 'pilot-accept@example.invalid', now(), '{"invite_password_set":true}'),
  ('10000000-0000-4000-8000-000000000006', 'inactive-a@example.invalid', now(), '{"invite_password_set":true}');

do $$
declare i integer;
begin
  for i in 2..5 loop
    insert into auth.users(id, email, email_confirmed_at, raw_app_meta_data)
    values (('10000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
      'employee-a-' || i || '@example.invalid', now(), '{"invite_password_set":true}');
  end loop;
  insert into public.app_members(company_id, user_id, name, email, role, active)
  values ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000006',
    'Inactive Employee A', 'inactive-a@example.invalid', 'employee', false);
  for i in 2..15 loop
    insert into auth.users(id, email, email_confirmed_at, raw_app_meta_data)
    values (('20000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
      'employee-b-' || i || '@example.invalid', now(), '{"invite_password_set":true}');
  end loop;
  insert into public.app_members(company_id, user_id, name, email, role, active) values
    ('11000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Owner A', 'owner-a@example.invalid', 'owner', true),
    ('22000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000001', 'Owner B', 'owner-b@example.invalid', 'owner', true),
    ('33000000-0000-4000-8000-000000000003', '30000000-0000-4000-8000-000000000001', 'Owner Pro', 'owner-pro@example.invalid', 'owner', true),
    ('44000000-0000-4000-8000-000000000004', '40000000-0000-4000-8000-000000000001', 'Owner Legacy', 'owner-legacy@example.invalid', 'owner', true);
  for i in 2..5 loop
    insert into public.app_members(company_id, user_id, name, email, role, active)
    values ('11000000-0000-4000-8000-000000000001',
      ('10000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
      'Employee A ' || i, 'employee-a-' || i || '@example.invalid', 'employee', true);
  end loop;
  for i in 2..15 loop
    insert into public.app_members(company_id, user_id, name, email, role, active)
    values ('22000000-0000-4000-8000-000000000002',
      ('20000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
      'Employee B ' || i, 'employee-b-' || i || '@example.invalid', 'employee', true);
  end loop;
end $$;

insert into public.app_invites(id, company_id, email, name, role, expires_at, accepted_at, revoked_at) values
  ('91000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'expired-a@example.invalid', 'Expired A', 'employee', now() - interval '1 day', null, null),
  ('91000000-0000-4000-8000-000000000002', '11000000-0000-4000-8000-000000000001', 'revoked-a@example.invalid', 'Revoked A', 'employee', now() + interval '7 days', null, now()),
  ('91000000-0000-4000-8000-000000000003', '11000000-0000-4000-8000-000000000001', 'accepted-a@example.invalid', 'Accepted A', 'employee', now() + interval '7 days', now(), null);

grant usage on schema public to authenticated;
grant select, insert, update on public.app_members, public.app_invites to authenticated;
grant execute on function public.app_create_invite(uuid, text, text) to authenticated;
grant execute on function public.app_accept_invite(uuid) to authenticated;
