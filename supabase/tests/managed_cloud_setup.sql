\set ON_ERROR_STOP on

create schema auth;
create table auth.users(id uuid primary key, email text not null);

alter table public.app_companies
  add column slug text unique,
  add column email text not null default '',
  add column public_form boolean not null default false,
  add column onboarding_completed boolean not null default false;
alter table public.app_companies alter column id set default gen_random_uuid();
alter table public.app_companies add constraint app_companies_plan_check
  check (plan in ('pilot', 'starter', 'business'));
alter table public.app_platform_audit_events add column target_id uuid;

create table public.app_invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  email text not null, name text not null, role text not null,
  expires_at timestamptz not null, accepted_at timestamptz,
  accepted_by uuid references auth.users(id), revoked_at timestamptz
);
create table public.app_members (
  company_id uuid not null references public.app_companies(id) on delete cascade,
  user_id uuid not null references auth.users(id),
  role text not null, active boolean not null default true,
  primary key(company_id,user_id)
);
create table public.app_company_legal_acceptances (
  company_id uuid not null references public.app_companies(id) on delete cascade,
  invite_id uuid not null references public.app_invites(id) on delete cascade,
  actor_user_id uuid not null,
  agreement text not null,
  capture_source text not null,
  client_accepted_at timestamptz not null
);
create table public.app_email_outbox (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  invite_id uuid references public.app_invites(id) on delete cascade,
  notification_kind text not null,
  recipient text not null,
  subject text not null,
  template_data jsonb not null,
  status text not null,
  attempts integer not null,
  scheduled_for timestamptz not null,
  payload_generation integer not null
);

-- The live staging baseline is pilot-only and private. The proposal validates
-- these exact clauses before replacing this function.
create or replace function public.app_platform_create_company_onboarding(
  p_actor_user_id uuid, p_name text, p_slug text, p_owner_name text, p_owner_email text,
  p_plan text default 'pilot', p_terms_accepted_at timestamptz default null, p_dpa_accepted_at timestamptz default null
)
returns table(company_id uuid, invite_id uuid, slug text)
language plpgsql security definer set search_path = ''
as $$
declare v_company_id uuid; v_slug text := lower(trim(coalesce(p_slug,''))); v_email text := lower(trim(coalesce(p_owner_email,'')));
begin
  if coalesce(p_plan,'pilot')<>'pilot' then raise exception 'invalid onboarding input'; end if;
  insert into public.app_companies(name,slug,email,plan,public_form,onboarding_completed)
  values(trim(p_name),v_slug,v_email,'pilot',false,false) returning id into v_company_id;
  return query select v_company_id, null::uuid, v_slug;
end;
$$;
