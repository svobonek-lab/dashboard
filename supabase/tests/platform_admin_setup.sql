\set ON_ERROR_STOP on

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create table auth.users (id uuid primary key, email text not null unique);
create function auth.uid() returns uuid language sql stable as $$
  select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;

create table public.app_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  color text not null default '#2563eb',
  logo_url text not null default '',
  active boolean not null default true,
  onboarding_completed boolean not null default false,
  plan text not null default 'pilot',
  created_at timestamptz not null default now()
);

create table public.app_members (
  company_id uuid not null references public.app_companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  email text not null,
  role text not null,
  active boolean not null default true,
  primary key (company_id, user_id)
);

create table public.app_leads (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  title text not null,
  customer text not null,
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  description text not null default '',
  status text not null default 'new',
  priority text not null default 'normal',
  assigned_to uuid,
  scheduled_at timestamptz,
  duration_minutes integer not null default 0,
  value numeric not null default 0,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1
);

alter table public.app_companies enable row level security;
alter table public.app_members enable row level security;
alter table public.app_leads enable row level security;
revoke all on public.app_companies, public.app_members, public.app_leads from public, anon, authenticated;

insert into auth.users(id, email) values
  ('90000000-0000-4000-8000-000000000009', 'admin@example.invalid'),
  ('91000000-0000-4000-8000-000000000019', 'other@example.invalid'),
  ('11000000-0000-4000-8000-000000000001', 'owner-a@example.invalid'),
  ('22000000-0000-4000-8000-000000000002', 'owner-b@example.invalid');

insert into public.app_companies(id, name, slug, onboarding_completed) values
  ('10000000-0000-4000-8000-000000000001', 'Firma A', 'firma-a', true),
  ('20000000-0000-4000-8000-000000000002', 'Firma B', 'firma-b', true);

insert into public.app_members(company_id, user_id, name, email, role) values
  ('10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'Owner A', 'owner-a@example.invalid', 'owner'),
  ('20000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', 'Owner B', 'owner-b@example.invalid', 'owner');

insert into public.app_leads(id, company_id, title, customer) values
  ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Lead A', 'Customer A'),
  ('b0000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Lead B', 'Customer B');
