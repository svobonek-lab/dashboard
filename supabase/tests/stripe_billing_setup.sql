\set ON_ERROR_STOP on

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create table public.app_companies (
  id uuid primary key,
  name text not null,
  plan text not null default 'pilot',
  active boolean not null default true
);

create table public.app_platform_admins (
  user_id uuid primary key,
  active boolean not null default true,
  revoked_at timestamptz
);

create table public.app_platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid,
  action text not null,
  company_id uuid references public.app_companies(id),
  outcome text not null,
  reason_code text not null,
  created_at timestamptz not null default now()
);

alter table public.app_companies enable row level security;
revoke all on public.app_companies from public, anon, authenticated;

insert into public.app_companies(id, name) values
  ('10000000-0000-4000-8000-000000000001', 'Firma A'),
  ('20000000-0000-4000-8000-000000000002', 'Firma B');

insert into public.app_platform_admins(user_id) values
  ('30000000-0000-4000-8000-000000000003');
