-- STAGING-ONLY REVIEW ARTIFACT — NEVER APPLY AUTOMATICALLY OR TO PRODUCTION.
-- The platform control plane can read only operational aggregates. It does not
-- add a platform-admin policy to any tenant table and never mints an Auth JWT.

begin;

alter table public.app_platform_admins force row level security;
alter table public.app_platform_support_sessions force row level security;
alter table public.app_platform_audit_events force row level security;
revoke all on public.app_platform_admins, public.app_platform_support_sessions,
  public.app_platform_audit_events from public, anon, authenticated;

drop function if exists public.app_create_platform_support_session(uuid, text);

create or replace function public.app_platform_list_companies(p_actor_user_id uuid)
returns table (
  id uuid, name text, slug text, active boolean, onboarding_completed boolean,
  created_at timestamptz, member_count bigint, subscription_status text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode = '42501'; end if;

  return query
  select c.id, c.name, c.slug, c.active, c.onboarding_completed, c.created_at,
    count(m.user_id) filter (where m.active = true)::bigint,
    'not_configured'::text
  from public.app_companies c
  left join public.app_members m on m.company_id = c.id
  group by c.id, c.name, c.slug, c.active, c.onboarding_completed, c.created_at
  order by c.created_at desc;
end;
$$;

create or replace function public.app_platform_create_support_session(p_actor_user_id uuid, p_company_id uuid, p_reason text)
returns table (id uuid, company_id uuid, access_mode text, created_at timestamptz, expires_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare v_session public.app_platform_support_sessions%rowtype;
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_reason, ''))) not between 3 and 500 then
    raise exception 'valid support reason required' using errcode = '22023';
  end if;
  if not exists (select 1 from public.app_companies c where c.id = p_company_id and c.active = true) then
    raise exception 'active company required' using errcode = '42501';
  end if;

  insert into public.app_platform_support_sessions(platform_admin_id, company_id, reason, access_mode, expires_at)
  values (p_actor_user_id, p_company_id, trim(p_reason), 'read_only', clock_timestamp() + interval '30 minutes')
  returning * into v_session;
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, support_session_id, outcome, reason_code)
  values (p_actor_user_id, 'support_session.created', p_company_id, v_session.id, 'allowed', 'operator_request');
  return query select v_session.id, v_session.company_id, v_session.access_mode, v_session.created_at, v_session.expires_at;
end;
$$;

create or replace function public.app_platform_get_support_session(p_actor_user_id uuid, p_session_id uuid)
returns table (
  id uuid, company_id uuid, company_name text, member_count bigint, subscription_status text,
  access_mode text, created_at timestamptz, expires_at timestamptz
)
language plpgsql
security definer
set search_path = ''
as $$
declare v_company_id uuid;
begin
  if not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode = '42501'; end if;
  select s.company_id into v_company_id from public.app_platform_support_sessions s
  where s.id = p_session_id and s.platform_admin_id = p_actor_user_id
    and s.access_mode = 'read_only' and s.revoked_at is null and s.expires_at > clock_timestamp();
  if v_company_id is null then raise exception 'active support session required' using errcode = '42501'; end if;

  insert into public.app_platform_audit_events(actor_user_id, action, company_id, support_session_id, outcome, reason_code)
  values (p_actor_user_id, 'support_session.viewed', v_company_id, p_session_id, 'allowed', 'operator_request');
  return query
  select s.id, c.id, c.name, count(m.user_id) filter (where m.active = true)::bigint,
    'not_configured'::text, s.access_mode, s.created_at, s.expires_at
  from public.app_platform_support_sessions s
  join public.app_companies c on c.id = s.company_id
  left join public.app_members m on m.company_id = c.id
  where s.id = p_session_id and s.platform_admin_id = p_actor_user_id
  group by s.id, c.id, c.name, s.access_mode, s.created_at, s.expires_at;
end;
$$;

create or replace function public.app_platform_revoke_support_session(p_actor_user_id uuid, p_session_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare v_company_id uuid;
begin
  if not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode = '42501'; end if;
  update public.app_platform_support_sessions s set revoked_at = clock_timestamp()
  where s.id = p_session_id and s.platform_admin_id = p_actor_user_id and s.revoked_at is null
  returning s.company_id into v_company_id;
  if v_company_id is null then return false; end if;
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, support_session_id, outcome, reason_code)
  values (p_actor_user_id, 'support_session.revoked', v_company_id, p_session_id, 'allowed', 'operator_request');
  return true;
end;
$$;

revoke all on function public.app_platform_list_companies(uuid) from public, anon, authenticated;
revoke all on function public.app_platform_create_support_session(uuid, uuid, text) from public, anon, authenticated;
revoke all on function public.app_platform_get_support_session(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_platform_revoke_support_session(uuid, uuid) from public, anon, authenticated;
grant execute on function public.app_platform_list_companies(uuid) to service_role;
grant execute on function public.app_platform_create_support_session(uuid, uuid, text) to service_role;
grant execute on function public.app_platform_get_support_session(uuid, uuid) to service_role;
grant execute on function public.app_platform_revoke_support_session(uuid, uuid) to service_role;

commit;
