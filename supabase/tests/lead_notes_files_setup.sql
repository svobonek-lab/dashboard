\set ON_ERROR_STOP on

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema auth;
create schema app_private;
create schema storage;

create table auth.users (
  id uuid primary key,
  email text not null unique
);

create function auth.uid()
returns uuid
language sql
stable
set search_path = ''
as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;

create table public.app_companies (
  id uuid primary key,
  name text not null,
  active boolean not null default true
);

create table public.app_members (
  company_id uuid not null references public.app_companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('owner', 'employee')),
  active boolean not null default true,
  primary key (company_id, user_id)
);

create table public.app_leads (
  id uuid primary key,
  company_id uuid not null references public.app_companies(id) on delete cascade,
  title text not null,
  customer text not null default '',
  email text not null default '',
  phone text not null default '',
  address text not null default '',
  description text not null default '',
  status text not null default 'new',
  priority text not null default 'normal',
  assigned_to uuid,
  scheduled_at timestamptz,
  duration_minutes integer not null default 60,
  value numeric not null default 0,
  source text not null default 'manual',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  revision integer not null default 1,
  import_fingerprint text,
  source_record_id text
);

create table public.app_lead_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id),
  lead_id uuid not null references public.app_leads(id) on delete cascade,
  actor_id uuid,
  operation text not null,
  old_status text,
  new_status text not null,
  old_assigned_to uuid,
  new_assigned_to uuid,
  old_value numeric,
  new_value numeric,
  created_at timestamptz not null default clock_timestamp()
);

create table storage.buckets (
  id text primary key,
  name text not null unique,
  public boolean not null default false,
  file_size_limit bigint,
  allowed_mime_types text[]
);

create table storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text not null references storage.buckets(id),
  name text not null,
  owner_id text,
  metadata jsonb,
  created_at timestamptz not null default clock_timestamp(),
  unique (bucket_id, name)
);

create or replace function app_private.app_role(p_company_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.app_members m
  where m.company_id = p_company_id
    and m.user_id = auth.uid()
    and m.active
  limit 1
$$;

create or replace function app_private.app_can_lead(p_company_id uuid, p_lead_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.app_leads l
    join public.app_members m
      on m.company_id = l.company_id
     and m.user_id = auth.uid()
     and m.active
    where l.id = p_lead_id
      and l.company_id = p_company_id
      and (m.role = 'owner' or l.assigned_to = m.user_id)
  )
$$;

revoke all on schema app_private from public, anon;
grant usage on schema app_private to authenticated;
revoke all on function app_private.app_role(uuid) from public, anon;
revoke all on function app_private.app_can_lead(uuid, uuid) from public, anon;
grant execute on function app_private.app_role(uuid) to authenticated;
grant execute on function app_private.app_can_lead(uuid, uuid) to authenticated;

alter table public.app_companies enable row level security;
alter table public.app_members enable row level security;
alter table public.app_leads enable row level security;
alter table public.app_lead_events enable row level security;
alter table storage.objects enable row level security;

revoke all on public.app_companies, public.app_members, public.app_leads, public.app_lead_events from public, anon, authenticated;
revoke all on storage.objects from public, anon, authenticated;
grant select, update on public.app_leads to authenticated;
grant select on public.app_lead_events to authenticated;
grant select, insert, delete on storage.objects to authenticated;

create policy app_leads_select_scoped on public.app_leads
for select to authenticated
using (
  app_private.app_role(company_id) = 'owner'
  or app_private.app_can_lead(company_id, id)
);

create policy app_leads_update_scoped on public.app_leads
for update to authenticated
using (
  app_private.app_role(company_id) = 'owner'
  or app_private.app_can_lead(company_id, id)
)
with check (
  app_private.app_role(company_id) = 'owner'
  or app_private.app_can_lead(company_id, id)
);

create policy app_lead_events_read on public.app_lead_events
for select to authenticated
using (
  app_private.app_role(company_id) = 'owner'
  or app_private.app_can_lead(company_id, lead_id)
);

create or replace function app_private.guard_lead_mutation()
returns trigger
language plpgsql
security invoker
set search_path = public, app_private, pg_temp
as $$
begin
  if current_user = 'authenticated'
    and app_private.app_role(new.company_id) = 'employee'
    and (
      old.assigned_to is distinct from auth.uid()
      or (to_jsonb(new) - 'status') is distinct from (to_jsonb(old) - 'status')
    ) then
    raise exception 'employee may only update assigned lead status' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE' then
    new.revision := old.revision + 1;
    new.updated_at := clock_timestamp();
  end if;
  return new;
end;
$$;

create trigger app_leads_guard_mutation
before update on public.app_leads
for each row execute function app_private.guard_lead_mutation();

insert into auth.users (id, email) values
  ('11000000-0000-4000-8000-000000000001', 'owner-a@example.invalid'),
  ('12000000-0000-4000-8000-000000000001', 'employee-a@example.invalid'),
  ('21000000-0000-4000-8000-000000000002', 'owner-b@example.invalid'),
  ('22000000-0000-4000-8000-000000000002', 'employee-b@example.invalid');

insert into public.app_companies (id, name) values
  ('10000000-0000-4000-8000-000000000001', 'Firma A'),
  ('20000000-0000-4000-8000-000000000002', 'Firma B');

insert into public.app_members (company_id, user_id, role) values
  ('10000000-0000-4000-8000-000000000001', '11000000-0000-4000-8000-000000000001', 'owner'),
  ('10000000-0000-4000-8000-000000000001', '12000000-0000-4000-8000-000000000001', 'employee'),
  ('20000000-0000-4000-8000-000000000002', '21000000-0000-4000-8000-000000000002', 'owner'),
  ('20000000-0000-4000-8000-000000000002', '22000000-0000-4000-8000-000000000002', 'employee');

insert into public.app_leads (id, company_id, title, assigned_to) values
  ('a0000000-0000-4000-8000-000000000001', '10000000-0000-4000-8000-000000000001', 'Zakázka A', '12000000-0000-4000-8000-000000000001'),
  ('b0000000-0000-4000-8000-000000000002', '20000000-0000-4000-8000-000000000002', 'Zakázka B', '22000000-0000-4000-8000-000000000002');
