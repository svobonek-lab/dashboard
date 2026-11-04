\set ON_ERROR_STOP on
create table public.app_companies (
  id uuid primary key default gen_random_uuid(), name text not null, slug text not null, email text,
  active boolean not null default true, onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(), plan text, subscription_status text,
  public_form boolean not null default false
);
create table public.app_members (company_id uuid not null, user_id uuid not null, active boolean not null default true, role text not null default 'owner');
create table public.app_invites (
  id uuid primary key default gen_random_uuid(), company_id uuid not null references public.app_companies(id) on delete cascade,
  email text not null, name text not null, role text not null, expires_at timestamptz not null,
  accepted_at timestamptz, revoked_at timestamptz, created_at timestamptz not null default now()
);
create table public.app_platform_admins (user_id uuid primary key, active boolean not null, revoked_at timestamptz);
create table public.app_leads (company_id uuid not null, created_at timestamptz not null default now());
create table public.app_company_legal_acceptances (
  id uuid primary key default gen_random_uuid(), company_id uuid not null, invite_id uuid, actor_user_id uuid not null,
  agreement text not null, agreement_version text not null default '2026-10-16', capture_source text not null,
  client_accepted_at timestamptz not null, accepted_at timestamptz not null default now()
);
create table public.app_platform_audit_events (
  id uuid primary key default gen_random_uuid(), actor_user_id uuid, action text not null, company_id uuid,
  target_id uuid, request_id text, outcome text not null, reason_code text not null, created_at timestamptz not null default now()
);
grant all on public.app_companies, public.app_members, public.app_invites, public.app_platform_admins,
  public.app_leads, public.app_company_legal_acceptances, public.app_platform_audit_events to service_role;
insert into public.app_companies(id,name,slug) values ('30000000-0000-4000-8000-000000000001','Company A','company-a');
insert into public.app_companies(id,name,slug) values ('30000000-0000-4000-8000-000000000003','Company C','company-c');
insert into public.app_platform_admins(user_id,active) values ('40000000-0000-4000-8000-000000000001',true);
insert into public.app_invites(id,company_id,email,name,role,expires_at)
values ('50000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','owner-a@example.test','Owner A','owner',now()+interval '7 days');
create function public.app_role(p_company_id uuid) returns text language sql stable as $$
  select 'owner'::text where p_company_id='30000000-0000-4000-8000-000000000001'
$$;
grant execute on function public.app_role(uuid) to authenticated;
