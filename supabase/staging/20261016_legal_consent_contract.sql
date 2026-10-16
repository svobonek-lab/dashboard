-- STAGING-ONLY PROPOSAL. Do not apply automatically and never apply to production.
-- Prerequisites: 20261012_platform_company_onboarding.sql and 20261013_invite_password_proof.sql.
-- Captures server-time evidence for the two agreements; client timestamp is validated but never trusted as the audit timestamp.

begin;

create table if not exists public.app_company_legal_acceptances (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete restrict,
  invite_id uuid references public.app_invites(id) on delete restrict,
  actor_user_id uuid not null references auth.users(id) on delete restrict,
  agreement text not null check (agreement in ('terms_of_service', 'data_processing_agreement')),
  agreement_version text not null default '2026-10-16',
  capture_source text not null check (capture_source in ('platform_company_onboarding', 'owner_invite_activation')),
  client_accepted_at timestamptz not null,
  accepted_at timestamptz not null default clock_timestamp(),
  unique(company_id, invite_id, actor_user_id, agreement, agreement_version, capture_source)
);

alter table public.app_company_legal_acceptances enable row level security;
revoke all on table public.app_company_legal_acceptances from public, anon, authenticated;
grant select, insert on table public.app_company_legal_acceptances to service_role;

create or replace function app_private.record_owner_legal_consent(
  p_invite_id uuid,
  p_client_accepted_at timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user_id uuid := auth.uid();
  v_invite public.app_invites;
  v_email text;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;
  if p_client_accepted_at is null
    or p_client_accepted_at < clock_timestamp() - interval '15 minutes'
    or p_client_accepted_at > clock_timestamp() + interval '2 minutes' then
    raise exception 'invalid legal consent timestamp' using errcode = '22023';
  end if;

  select lower(u.email) into strict v_email from auth.users u where u.id = v_user_id;
  select * into v_invite from public.app_invites i where i.id = p_invite_id for update;
  if not found
    or v_invite.role <> 'owner'
    or v_invite.accepted_at is not null
    or v_invite.revoked_at is not null
    or v_invite.expires_at <= clock_timestamp()
    or lower(v_invite.email) is distinct from v_email then
    raise exception 'owner invitation is invalid' using errcode = '42501';
  end if;

  insert into public.app_company_legal_acceptances(
    company_id, invite_id, actor_user_id, agreement, capture_source, client_accepted_at
  ) values
    (v_invite.company_id, v_invite.id, v_user_id, 'terms_of_service', 'owner_invite_activation', p_client_accepted_at),
    (v_invite.company_id, v_invite.id, v_user_id, 'data_processing_agreement', 'owner_invite_activation', p_client_accepted_at)
  on conflict do nothing;

  insert into public.app_platform_audit_events(
    actor_user_id, action, company_id, target_id, outcome, reason_code
  ) values (
    v_user_id, 'company_legal_consent.accepted', v_invite.company_id, v_invite.id,
    'allowed', 'owner_invite_activation'
  );
end;
$$;

create or replace function public.app_record_owner_legal_consent(
  p_invite_id uuid,
  p_client_accepted_at timestamptz
)
returns void
language sql
security invoker
set search_path = ''
as $$ select app_private.record_owner_legal_consent(p_invite_id, p_client_accepted_at) $$;

create or replace function app_private.accept_invite(p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.app_invites;
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
  v_password_was_set boolean;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select lower(u.email), u.email_confirmed_at,
    coalesce((u.raw_app_meta_data ->> 'invite_password_set')::boolean, false)
  into strict v_email, v_email_confirmed_at, v_password_was_set
  from auth.users u where u.id = v_user_id;
  if v_email_confirmed_at is null then raise exception 'verified email required' using errcode = '42501'; end if;
  if not v_password_was_set then raise exception 'password setup required' using errcode = '42501'; end if;

  select * into v_invite from public.app_invites i where i.id = p_invite_id for update;
  if not found or v_invite.accepted_at is not null or v_invite.revoked_at is not null
    or v_invite.expires_at <= clock_timestamp() or lower(v_invite.email) is distinct from v_email
    or v_invite.role not in ('owner', 'employee') then
    raise exception 'invitation is invalid, expired, used, or belongs to another account' using errcode = '42501';
  end if;
  if not exists (select 1 from public.app_companies c where c.id = v_invite.company_id and c.active) then
    raise exception 'company is not active' using errcode = '42501';
  end if;
  if v_invite.role = 'owner' and not exists (
    select 1 from public.app_company_legal_acceptances a
    where a.company_id = v_invite.company_id and a.invite_id = v_invite.id and a.actor_user_id = v_user_id
      and a.capture_source = 'owner_invite_activation' and a.agreement = 'terms_of_service'
  ) then raise exception 'owner legal consent required' using errcode = '42501'; end if;
  if v_invite.role = 'owner' and not exists (
    select 1 from public.app_company_legal_acceptances a
    where a.company_id = v_invite.company_id and a.invite_id = v_invite.id and a.actor_user_id = v_user_id
      and a.capture_source = 'owner_invite_activation' and a.agreement = 'data_processing_agreement'
  ) then raise exception 'owner data-processing agreement required' using errcode = '42501'; end if;
  if v_invite.role = 'owner' and exists (
    select 1 from public.app_members m where m.company_id = v_invite.company_id and m.role = 'owner' and m.active
  ) then raise exception 'company already has an active owner' using errcode = '42501'; end if;

  insert into public.app_members(company_id, user_id, name, email, role, active)
  values(v_invite.company_id, v_user_id, v_invite.name, v_email, v_invite.role, true)
  on conflict(company_id, user_id) do update set name = excluded.name, email = excluded.email, role = excluded.role, active = true;
  update public.app_invites set accepted_at = clock_timestamp(), accepted_by = v_user_id where id = v_invite.id;
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, target_id, outcome, reason_code)
  values(v_user_id, 'company_invite.accepted', v_invite.company_id, v_invite.id, 'allowed', 'verified_invitation_with_password_and_legal_consent');
  return jsonb_build_object('companyId', v_invite.company_id, 'userId', v_user_id, 'role', v_invite.role);
end;
$$;

-- The API has already validated both timestamps; this RPC repeats the check and preserves the platform operator as evidence actor.
drop function if exists public.app_platform_create_company_onboarding(uuid, text, text, text, text, text);
create or replace function public.app_platform_create_company_onboarding(
  p_actor_user_id uuid, p_name text, p_slug text, p_owner_name text, p_owner_email text,
  p_plan text default 'pilot', p_terms_accepted_at timestamptz default null, p_dpa_accepted_at timestamptz default null
)
returns table (company_id uuid, invite_id uuid, slug text)
language plpgsql security definer set search_path = ''
as $$
declare
  v_company_id uuid; v_invite_id uuid; v_slug text := lower(trim(coalesce(p_slug, ''))); v_email text := lower(trim(coalesce(p_owner_email, '')));
begin
  if p_actor_user_id is null or not exists (select 1 from public.app_platform_admins a where a.user_id = p_actor_user_id and a.active and a.revoked_at is null) then raise exception 'active platform administrator required' using errcode = '42501'; end if;
  if p_terms_accepted_at is null or p_dpa_accepted_at is null or p_terms_accepted_at < clock_timestamp() - interval '15 minutes' or p_dpa_accepted_at < clock_timestamp() - interval '15 minutes' or p_terms_accepted_at > clock_timestamp() + interval '2 minutes' or p_dpa_accepted_at > clock_timestamp() + interval '2 minutes' then raise exception 'legal consent required' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 160 then raise exception 'invalid company name' using errcode = '22023'; end if;
  if v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 80 then raise exception 'invalid company slug' using errcode = '22023'; end if;
  if char_length(trim(coalesce(p_owner_name, ''))) not between 2 and 160 or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(v_email) > 254 then raise exception 'invalid owner identity' using errcode = '22023'; end if;
  if coalesce(p_plan, 'pilot') <> 'pilot' then raise exception 'unsupported onboarding plan' using errcode = '22023'; end if;

  insert into public.app_companies(name, slug, email, plan, public_form, onboarding_completed) values (trim(p_name), v_slug, v_email, 'pilot', true, false) returning id into v_company_id;
  insert into public.app_invites(company_id, email, name, role, expires_at) values (v_company_id, v_email, trim(p_owner_name), 'owner', clock_timestamp() + interval '7 days') returning id into v_invite_id;
  insert into public.app_company_legal_acceptances(company_id, invite_id, actor_user_id, agreement, capture_source, client_accepted_at) values
    (v_company_id, v_invite_id, p_actor_user_id, 'terms_of_service', 'platform_company_onboarding', p_terms_accepted_at),
    (v_company_id, v_invite_id, p_actor_user_id, 'data_processing_agreement', 'platform_company_onboarding', p_dpa_accepted_at);
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, target_id, outcome, reason_code) values (p_actor_user_id, 'company_onboarding.created', v_company_id, v_invite_id, 'allowed', 'platform_admin_request_with_legal_consent');
  return query select v_company_id, v_invite_id, v_slug;
end;
$$;

revoke all on function app_private.record_owner_legal_consent(uuid, timestamptz) from public, anon, authenticated;
revoke all on function public.app_record_owner_legal_consent(uuid, timestamptz) from public, anon;
revoke all on function app_private.accept_invite(uuid) from public, anon, authenticated;
revoke all on function public.app_accept_invite(uuid) from public, anon;
revoke all on function public.app_platform_create_company_onboarding(uuid, text, text, text, text, text, timestamptz, timestamptz) from public, anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on function public.app_record_owner_legal_consent(uuid, timestamptz) to authenticated;
grant execute on function app_private.accept_invite(uuid) to authenticated;
grant execute on function public.app_accept_invite(uuid) to authenticated;
grant execute on function public.app_platform_create_company_onboarding(uuid, text, text, text, text, text, timestamptz, timestamptz) to service_role;

commit;