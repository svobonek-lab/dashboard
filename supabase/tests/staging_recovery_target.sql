-- Baseline for an empty loopback Supabase target used only by the recovery drill.
\set ON_ERROR_STOP on
begin;

create schema app_private;
create table public.app_companies (
  id uuid primary key,
  name text not null,
  slug text not null unique,
  active boolean not null,
  created_at timestamptz not null
);
create table public.app_members (
  company_id uuid not null references public.app_companies(id),
  user_id uuid not null references auth.users(id),
  name text not null,
  email text not null,
  role text not null check (role in ('owner', 'employee')),
  active boolean not null,
  primary key (company_id, user_id)
);
create table public.app_leads (
  id uuid primary key,
  company_id uuid not null references public.app_companies(id),
  title text not null,
  customer text not null,
  assigned_to uuid,
  status text not null,
  source text not null,
  created_at timestamptz not null,
  updated_at timestamptz not null,
  foreign key (company_id, assigned_to) references public.app_members(company_id, user_id)
);
create table public.app_lead_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id),
  lead_id uuid not null references public.app_leads(id),
  actor_id uuid not null references auth.users(id),
  operation text not null,
  new_status text not null
);

create function app_private.app_role(company uuid) returns text
language sql stable security definer set search_path = '' as $$
  select role from public.app_members where company_id = company and user_id = auth.uid() and active
$$;
create function app_private.app_can_lead(company uuid, lead uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.app_leads l
    join public.app_members m on m.company_id = l.company_id and m.user_id = auth.uid() and m.active
    where l.company_id = company and l.id = lead and (m.role = 'owner' or l.assigned_to = m.user_id)
  )
$$;
revoke all on schema app_private from public, anon;
revoke all on all functions in schema app_private from public, anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.app_role(uuid), app_private.app_can_lead(uuid, uuid) to authenticated;

alter table public.app_companies enable row level security;
alter table public.app_members enable row level security;
alter table public.app_leads enable row level security;
alter table public.app_lead_events enable row level security;
revoke all on public.app_companies, public.app_members, public.app_leads, public.app_lead_events from public, anon, authenticated;
grant select on public.app_leads to authenticated;
grant select, insert on public.app_companies, public.app_members, public.app_leads to service_role;
create policy recovery_read_scoped_lead on public.app_leads for select to authenticated
  using (app_private.app_can_lead(company_id, id));

commit;
