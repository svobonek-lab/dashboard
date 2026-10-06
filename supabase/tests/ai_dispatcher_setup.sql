\set ON_ERROR_STOP on

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create table public.app_companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  active boolean not null default true,
  public_form boolean not null default true
);

create table public.app_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  user_id uuid not null,
  email text not null,
  role text not null,
  active boolean not null default true
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
  value numeric not null default 0,
  source text not null default 'manual',
  created_at timestamptz not null default now()
);

create table public.app_public_intake_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  request_key text not null,
  created_at timestamptz not null default now(),
  unique (company_id, request_key)
);

alter table public.app_companies enable row level security;
alter table public.app_members enable row level security;
alter table public.app_leads enable row level security;
alter table public.app_public_intake_events enable row level security;

revoke all on public.app_companies, public.app_members, public.app_leads, public.app_public_intake_events
  from public, anon, authenticated;

insert into public.app_companies(id, name, slug)
values
  ('10000000-0000-4000-8000-000000000001', 'Firma A', 'firma-a'),
  ('20000000-0000-4000-8000-000000000002', 'Firma B', 'firma-b');

insert into public.app_members(company_id, user_id, email, role)
values
  ('10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'owner-a@example.invalid', 'owner'),
  ('20000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', 'owner-b@example.invalid', 'owner');
