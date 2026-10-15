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

alter table public.app_companies enable row level security;
revoke all on public.app_companies from public, anon, authenticated;

insert into public.app_companies(id, name) values
  ('10000000-0000-4000-8000-000000000001', 'Firma A'),
  ('20000000-0000-4000-8000-000000000002', 'Firma B');
