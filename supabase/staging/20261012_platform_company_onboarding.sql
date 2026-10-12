-- STAGING-ONLY REVIEW ARTIFACT — NEVER APPLY AUTOMATICALLY OR TO PRODUCTION.
-- Platform company onboarding remains behind the service-role API boundary.

begin;

alter table public.app_invites add column if not exists revoked_at timestamptz;
create unique index if not exists app_invites_one_pending_owner
  on public.app_invites(company_id) where role = 'owner' and accepted_at is null and revoked_at is null;

drop function if exists public.app_platform_list_companies(uuid);

create or replace function public.app_platform_list_companies(p_actor_user_id uuid)
returns table (
  id uuid, name text, slug text, active boolean, onboarding_completed boolean,
  created_at timestamptz, member_count bigint, subscription_status text,
  invitation_status text, first_lead_at timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode = '42501'; end if;

  return query
  select c.id, c.name, c.slug, c.active, c.onboarding_completed, c.created_at,
    count(distinct m.user_id) filter (where m.active = true)::bigint,
    coalesce(nullif(c.plan, ''), 'not_configured')::text,
    case
      when bool_or(i.accepted_at is not null) then 'accepted'::text
      when count(i.id) > 0 then 'sent'::text
      else 'not_sent'::text
    end,
    min(l.created_at)
  from public.app_companies c
  left join public.app_members m on m.company_id = c.id
  left join public.app_invites i on i.company_id = c.id and i.role = 'owner' and i.revoked_at is null
  left join public.app_leads l on l.company_id = c.id
  group by c.id, c.name, c.slug, c.active, c.onboarding_completed, c.created_at, c.plan
  order by c.created_at desc;
end;
$$;

create or replace function public.app_platform_create_company_onboarding(
  p_actor_user_id uuid,
  p_name text,
  p_slug text,
  p_owner_name text,
  p_owner_email text,
  p_plan text default 'pilot'
)
returns table (company_id uuid, invite_id uuid, slug text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_company_id uuid;
  v_invite_id uuid;
  v_slug text := lower(trim(coalesce(p_slug, '')));
  v_email text := lower(trim(coalesce(p_owner_email, '')));
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode = '42501'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 160 then
    raise exception 'invalid company name' using errcode = '22023';
  end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 80 then
    raise exception 'invalid company slug' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_owner_name, ''))) not between 2 and 160
     or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
     or char_length(v_email) > 254 then
    raise exception 'invalid owner identity' using errcode = '22023';
  end if;
  if coalesce(p_plan, 'pilot') <> 'pilot' then
    raise exception 'unsupported onboarding plan' using errcode = '22023';
  end if;

  insert into public.app_companies(name, slug, email, plan, public_form, onboarding_completed)
  values (trim(p_name), v_slug, v_email, 'pilot', true, false)
  returning id into v_company_id;

  insert into public.app_invites(company_id, email, name, role, expires_at)
  values (v_company_id, v_email, trim(p_owner_name), 'owner', clock_timestamp() + interval '7 days')
  returning id into v_invite_id;

  insert into public.app_platform_audit_events(
    actor_user_id, action, company_id, target_id, outcome, reason_code
  ) values (
    p_actor_user_id, 'company_onboarding.created', v_company_id, v_invite_id,
    'allowed', 'platform_admin_request'
  );

  return query select v_company_id, v_invite_id, v_slug;
end;
$$;

create or replace function public.app_platform_cancel_company_onboarding(
  p_actor_user_id uuid, p_company_id uuid, p_invite_id uuid
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_deleted uuid;
begin
  if not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode = '42501'; end if;
  if not exists (
    select 1 from public.app_invites i
    where i.id = p_invite_id and i.company_id = p_company_id and i.role = 'owner' and i.accepted_at is null and i.revoked_at is null
  ) or exists (select 1 from public.app_members m where m.company_id = p_company_id)
    or exists (select 1 from public.app_leads l where l.company_id = p_company_id) then
    raise exception 'onboarding can no longer be cancelled' using errcode = '42501';
  end if;

  delete from public.app_companies c where c.id = p_company_id returning c.id into v_deleted;
  if v_deleted is null then raise exception 'company not found' using errcode = 'P0002'; end if;
  insert into public.app_platform_audit_events(
    actor_user_id, action, request_id, target_id, outcome, reason_code
  ) values (
    p_actor_user_id, 'company_onboarding.failed', p_company_id::text, p_invite_id,
    'failed', 'owner_invite_delivery_failed'
  );
  return true;
end;
$$;

create or replace function public.app_platform_resend_owner_invite(
  p_actor_user_id uuid, p_company_id uuid
)
returns table (invite_id uuid, owner_email text, owner_name text)
language plpgsql security definer set search_path = ''
as $$
declare v_email text; v_name text; v_invite_id uuid;
begin
  if not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode = '42501'; end if;
  if exists (select 1 from public.app_members m where m.company_id = p_company_id and m.role = 'owner' and m.active) then
    raise exception 'owner already active' using errcode = '22023';
  end if;
  select i.email, i.name into v_email, v_name from public.app_invites i
  where i.company_id = p_company_id and i.role = 'owner'
  order by i.created_at desc limit 1;
  if v_email is null then raise exception 'owner invite not found' using errcode = 'P0002'; end if;
  update public.app_invites i set revoked_at = clock_timestamp()
  where i.company_id = p_company_id and i.role = 'owner' and i.accepted_at is null and i.revoked_at is null;
  insert into public.app_invites(company_id, email, name, role, expires_at)
  values (p_company_id, v_email, v_name, 'owner', clock_timestamp() + interval '7 days') returning id into v_invite_id;
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, target_id, outcome, reason_code)
  values (p_actor_user_id, 'company_invite.resent', p_company_id, v_invite_id, 'allowed', 'platform_admin_request');
  return query select v_invite_id, v_email, v_name;
end;
$$;

create or replace function public.app_platform_get_public_form_link(
  p_actor_user_id uuid, p_company_id uuid
)
returns table (slug text)
language plpgsql security definer set search_path = ''
as $$
declare v_slug text;
begin
  if not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode = '42501'; end if;
  select c.slug into v_slug from public.app_companies c where c.id = p_company_id and c.active and c.public_form;
  if v_slug is null then raise exception 'public form unavailable' using errcode = 'P0002'; end if;
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, outcome, reason_code)
  values (p_actor_user_id, 'company_public_form_link.requested', p_company_id, 'allowed', 'platform_admin_request');
  return query select v_slug;
end;
$$;

create or replace function public.app_platform_cancel_owner_invite(
  p_actor_user_id uuid, p_company_id uuid, p_invite_id uuid
)
returns boolean
language plpgsql security definer set search_path = ''
as $$
declare v_deleted uuid;
begin
  if not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode = '42501'; end if;
  delete from public.app_invites i
  where i.id = p_invite_id and i.company_id = p_company_id and i.role = 'owner' and i.accepted_at is null and i.revoked_at is null
  returning i.id into v_deleted;
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, target_id, outcome, reason_code)
  values (p_actor_user_id, 'company_invite.failed', p_company_id, p_invite_id, 'failed', 'owner_invite_delivery_failed');
  return v_deleted is not null;
end;
$$;

create schema if not exists app_private;

create or replace function app_private.accept_invite(p_invite_id uuid)
returns jsonb
language plpgsql security definer set search_path = ''
as $$
declare
  v_invite public.app_invites;
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
begin
  if v_user_id is null then raise exception 'authenticated user required' using errcode = '42501'; end if;
  select lower(u.email), u.email_confirmed_at into strict v_email, v_email_confirmed_at
  from auth.users u where u.id = v_user_id;
  if v_email_confirmed_at is null then raise exception 'verified email required' using errcode = '42501'; end if;

  select * into v_invite from public.app_invites i where i.id = p_invite_id for update;
  if not found or v_invite.accepted_at is not null or v_invite.revoked_at is not null or v_invite.expires_at <= clock_timestamp()
    or lower(v_invite.email) is distinct from v_email or v_invite.role not in ('owner', 'employee') then
    raise exception 'invitation is invalid, expired, used, or belongs to another account' using errcode = '42501';
  end if;
  if not exists (select 1 from public.app_companies c where c.id = v_invite.company_id and c.active) then
    raise exception 'company is not active' using errcode = '42501';
  end if;
  if v_invite.role = 'owner' and exists (
    select 1 from public.app_members m where m.company_id = v_invite.company_id and m.role = 'owner' and m.active
  ) then raise exception 'company already has an active owner' using errcode = '42501'; end if;

  insert into public.app_members(company_id, user_id, name, email, role, active)
  values(v_invite.company_id, v_user_id, v_invite.name, v_email, v_invite.role, true)
  on conflict(company_id, user_id) do update
    set name = excluded.name, email = excluded.email, role = excluded.role, active = true;
  update public.app_invites set accepted_at = clock_timestamp(), accepted_by = v_user_id where id = v_invite.id;
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, target_id, outcome, reason_code)
  values(v_user_id, 'company_invite.accepted', v_invite.company_id, v_invite.id, 'allowed', 'verified_invitation');
  return jsonb_build_object('companyId', v_invite.company_id, 'userId', v_user_id, 'role', v_invite.role);
end;
$$;

create or replace function public.app_accept_invite(p_invite_id uuid)
returns jsonb language sql security invoker set search_path = ''
as $$ select app_private.accept_invite(p_invite_id) $$;

revoke all on function public.app_platform_list_companies(uuid) from public, anon, authenticated;
revoke all on function public.app_platform_create_company_onboarding(uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.app_platform_cancel_company_onboarding(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_platform_resend_owner_invite(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_platform_get_public_form_link(uuid, uuid) from public, anon, authenticated;
revoke all on function public.app_platform_cancel_owner_invite(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function app_private.accept_invite(uuid) from public, anon, authenticated;
revoke all on function public.app_accept_invite(uuid) from public, anon;
grant execute on function public.app_platform_list_companies(uuid) to service_role;
grant execute on function public.app_platform_create_company_onboarding(uuid, text, text, text, text, text) to service_role;
grant execute on function public.app_platform_cancel_company_onboarding(uuid, uuid, uuid) to service_role;
grant execute on function public.app_platform_resend_owner_invite(uuid, uuid) to service_role;
grant execute on function public.app_platform_get_public_form_link(uuid, uuid) to service_role;
grant execute on function public.app_platform_cancel_owner_invite(uuid, uuid, uuid) to service_role;
grant usage on schema app_private to authenticated;
grant execute on function app_private.accept_invite(uuid) to authenticated;
grant execute on function public.app_accept_invite(uuid) to authenticated;

commit;
