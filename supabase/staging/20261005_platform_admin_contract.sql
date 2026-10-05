-- STAGING-ONLY PROPOSAL — DO NOT APPLY TO PRODUCTION
-- Platform operators are deliberately separate from tenant membership. This
-- artifact creates no policy that grants platform administrators access to
-- app_companies, app_members, app_leads, or other customer-row tables.

begin;

create table if not exists public.app_platform_admins (
  user_id uuid primary key references auth.users(id) on delete restrict,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  revoked_at timestamptz,
  notes text,
  constraint app_platform_admins_revocation_check
    check ((active and revoked_at is null) or (not active))
);
alter table public.app_platform_admins enable row level security;
revoke all on public.app_platform_admins from public, anon, authenticated;

create table if not exists public.app_platform_support_sessions (
  id uuid primary key default gen_random_uuid(),
  platform_admin_id uuid not null references public.app_platform_admins(user_id) on delete restrict,
  company_id uuid not null references public.app_companies(id) on delete cascade,
  reason text not null check (char_length(trim(reason)) between 3 and 500),
  access_mode text not null default 'read_only' check (access_mode = 'read_only'),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  constraint app_platform_support_session_expiry
    check (expires_at > created_at and expires_at <= created_at + interval '30 minutes')
);
alter table public.app_platform_support_sessions enable row level security;
revoke all on public.app_platform_support_sessions from public, anon, authenticated;

create table if not exists public.app_platform_audit_events (
  id uuid primary key default gen_random_uuid(),
  actor_user_id uuid references auth.users(id) on delete set null,
  action text not null check (char_length(action) between 3 and 80),
  company_id uuid references public.app_companies(id) on delete set null,
  support_session_id uuid references public.app_platform_support_sessions(id) on delete set null,
  request_id text,
  outcome text not null check (outcome in ('allowed', 'denied', 'failed')),
  reason_code text not null check (char_length(reason_code) between 2 and 80),
  created_at timestamptz not null default now()
);
alter table public.app_platform_audit_events enable row level security;
revoke all on public.app_platform_audit_events from public, anon, authenticated;

create or replace function public.app_get_my_platform_role()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select case
    when exists (
      select 1
      from public.app_platform_admins a
      where a.user_id = auth.uid()
        and a.active = true
        and a.revoked_at is null
    ) then jsonb_build_object('role', 'platform_admin', 'active', true)
    else jsonb_build_object('role', null, 'active', false)
  end
$$;
revoke all on function public.app_get_my_platform_role() from public, anon;
grant execute on function public.app_get_my_platform_role() to authenticated;

create or replace function public.app_create_platform_support_session(
  p_company_id uuid,
  p_reason text
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_session_id uuid;
begin
  if v_actor is null or not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = v_actor and a.active = true and a.revoked_at is null
  ) then
    raise exception 'active platform administrator required';
  end if;
  if not exists (select 1 from public.app_companies c where c.id = p_company_id) then
    raise exception 'company not found';
  end if;

  insert into public.app_platform_support_sessions (
    platform_admin_id, company_id, reason, expires_at
  ) values (
    v_actor, p_company_id, trim(p_reason), now() + interval '30 minutes'
  ) returning id into v_session_id;

  insert into public.app_platform_audit_events (
    actor_user_id, action, company_id, support_session_id, outcome, reason_code
  ) values (
    v_actor, 'support_session.created', p_company_id, v_session_id, 'allowed', 'operator_request'
  );

  return v_session_id;
end;
$$;
revoke all on function public.app_create_platform_support_session(uuid, text) from public, anon, authenticated;
grant execute on function public.app_create_platform_support_session(uuid, text) to service_role;

commit;
