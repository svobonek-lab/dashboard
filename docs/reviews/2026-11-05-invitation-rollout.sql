-- STAGING-ONLY REVIEW BUNDLE. Apply only after separate approval.

-- Generated with node scripts/prepare-invitation-rollout.mjs

-- Legacy RPC retirement is a separate step after live acceptance.

begin;

-- Source supabase/staging/20261105_invitation_rollout_prerequisites.sql
-- SHA256 2441516ae523b22f555dba846094ad74cc2c9f64e03e4a3cb7f44541e4f10311
-- STAGING-ONLY PROPOSAL. Baseline checked against StavbaCore Staging metadata.

do $$
begin
  if to_regclass('public.app_invites') is null
    or to_regclass('public.app_platform_audit_events') is null
    or to_regnamespace('app_private') is null
    or to_regprocedure('public.app_role(uuid)') is null then
    raise exception 'Invitation rollout baseline is missing';
  end if;
end;
$$;
alter table public.app_platform_audit_events add column if not exists target_id uuid;
alter table public.app_invites
  add column if not exists accepted_by uuid references auth.users(id) on delete set null;

-- Source supabase/migrations/20261027000000_app_email_outbox_runs.sql
-- SHA256 c3738bead2ed30a9aa3b3c6a09514adad49acd0794f57094f15b861bf7692677
-- Durable, service-only evidence for the outbox scheduler's latest runs.

create table if not exists public.app_email_outbox_runs (
  id uuid primary key default gen_random_uuid(),
  status text not null check (status in ('running', 'success', 'partial', 'failed')),
  started_at timestamptz not null,
  completed_at timestamptz,
  stale_lead_alerts_queued integer not null default 0 check (stale_lead_alerts_queued >= 0),
  selected_count integer not null default 0 check (selected_count >= 0),
  delivered_count integer not null default 0 check (delivered_count >= 0),
  retry_count integer not null default 0 check (retry_count >= 0),
  failed_count integer not null default 0 check (failed_count >= 0),
  skipped_count integer not null default 0 check (skipped_count >= 0),
  error_code text check (error_code is null or error_code ~ '^[A-Z][A-Z0-9_]{0,63}$'),
  constraint app_email_outbox_runs_window check (
    (status = 'running' and completed_at is null)
    or (status <> 'running' and completed_at >= started_at)
  )
);

create index if not exists app_email_outbox_runs_completed_idx
  on public.app_email_outbox_runs (completed_at desc);

alter table public.app_email_outbox_runs enable row level security;
revoke all on table public.app_email_outbox_runs from public, anon, authenticated;
grant select, insert, update on table public.app_email_outbox_runs to service_role;

-- Source supabase/staging/20261103_outbox_worker_legacy_compat.sql
-- SHA256 a2be2ba2a79e1f56c33d412f9d51c09797d61818d4463b16834a91e17c612f66
-- STAGING-ONLY PROPOSAL. Review against a fresh metadata snapshot before applying.
-- Adds the columns and states used by the server outbox worker while preserving
-- legacy queued rows, status values and columns. The sensitive queue is service-role-only.

do $$
begin
  if to_regclass('public.app_email_outbox') is null then
    raise exception 'Expected the existing staging public.app_email_outbox table.';
  end if;
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_email_outbox' and column_name = 'html'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_email_outbox' and column_name = 'provider_id'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_email_outbox' and column_name = 'sent_at'
  ) or not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'app_email_outbox' and column_name = 'claimed_at'
  ) then
    raise exception 'Outbox shape differs from the reviewed legacy StavbaCore staging contract; no changes applied.';
  end if;
end;
$$;

alter table public.app_email_outbox
  add column if not exists body text not null default '',
  add column if not exists body_html text,
  add column if not exists provider_message_id text,
  add column if not exists delivered_at timestamptz,
  add column if not exists updated_at timestamptz;

update public.app_email_outbox
set body_html = coalesce(body_html, html),
    provider_message_id = coalesce(provider_message_id, provider_id),
    delivered_at = coalesce(delivered_at, sent_at),
    updated_at = coalesce(updated_at, claimed_at, sent_at, created_at, now());

alter table public.app_email_outbox
  alter column html set default '',
  alter column updated_at set default now(),
  alter column updated_at set not null;

do $$
declare policy_row record;
begin
  for policy_row in select policyname from pg_policies where schemaname = 'public' and tablename = 'app_email_outbox' loop
    execute format('drop policy %I on public.app_email_outbox', policy_row.policyname);
  end loop;
end;
$$;
revoke all on table public.app_email_outbox from public, anon, authenticated;
grant select, insert, update on table public.app_email_outbox to service_role;

alter table public.app_email_outbox
  drop constraint if exists app_email_outbox_status_check;
alter table public.app_email_outbox
  add constraint app_email_outbox_status_check
  check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled', 'processing', 'delivered', 'retry'));

create index if not exists app_email_outbox_worker_pending_idx
  on public.app_email_outbox(status, scheduled_for, created_at)
  where status in ('pending', 'retry');
create index if not exists app_email_outbox_worker_stale_idx
  on public.app_email_outbox(status, updated_at)
  where status in ('processing', 'sending');

-- Source supabase/staging/20261013_invite_password_gate.sql
-- SHA256 b1a78729a83268d8d5ee0272cd1299f96263183852e2b426937acfb03bfc87c8
-- STAGING-ONLY REVIEW PACKAGE. Apply manually after review; never run automatically.
-- Prevents an invited Auth session from activating company membership until the
-- user has actually stored a password in Supabase Auth.


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
  v_has_password boolean;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select
    lower(u.email),
    u.email_confirmed_at,
    nullif(u.encrypted_password, '') is not null
  into strict v_email, v_email_confirmed_at, v_has_password
  from auth.users u
  where u.id = v_user_id;

  if v_email_confirmed_at is null then
    raise exception 'verified email required' using errcode = '42501';
  end if;
  if not v_has_password then
    raise exception 'password setup required' using errcode = '42501';
  end if;

  select *
  into v_invite
  from public.app_invites i
  where i.id = p_invite_id
  for update;

  if not found
    or v_invite.accepted_at is not null
    or v_invite.revoked_at is not null
    or v_invite.expires_at <= clock_timestamp()
    or lower(v_invite.email) is distinct from v_email
    or v_invite.role not in ('owner', 'employee') then
    raise exception 'invitation is invalid, expired, used, or belongs to another account'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.app_companies c
    where c.id = v_invite.company_id and c.active
  ) then
    raise exception 'company is not active' using errcode = '42501';
  end if;

  if v_invite.role = 'owner' and exists (
    select 1 from public.app_members m
    where m.company_id = v_invite.company_id and m.role = 'owner' and m.active
  ) then
    raise exception 'company already has an active owner' using errcode = '42501';
  end if;

  insert into public.app_members(company_id, user_id, name, email, role, active)
  values(v_invite.company_id, v_user_id, v_invite.name, v_email, v_invite.role, true)
  on conflict(company_id, user_id) do update
    set name = excluded.name,
        email = excluded.email,
        role = excluded.role,
        active = true;

  update public.app_invites
  set accepted_at = clock_timestamp(), accepted_by = v_user_id
  where id = v_invite.id;

  insert into public.app_platform_audit_events(
    actor_user_id, action, company_id, target_id, outcome, reason_code
  ) values (
    v_user_id, 'company_invite.accepted', v_invite.company_id, v_invite.id,
    'allowed', 'verified_invitation_with_password'
  );

  return jsonb_build_object(
    'companyId', v_invite.company_id,
    'userId', v_user_id,
    'role', v_invite.role
  );
end;
$$;

create or replace function public.app_accept_invite(p_invite_id uuid)
returns jsonb
language sql
security definer
set search_path = ''
as $$ select app_private.accept_invite(p_invite_id) $$;

revoke all on function app_private.accept_invite(uuid) from public, anon, authenticated;
revoke all on function public.app_accept_invite(uuid) from public, anon, authenticated;
grant execute on function public.app_accept_invite(uuid) to authenticated;

-- Source supabase/staging/20261013_invite_password_proof.sql
-- SHA256 b4bc7c4d24fc20ea7e007ec43816f4aabb8012e166c272d5a36114a85422e591
-- STAGING-ONLY FOLLOW-UP. Apply manually after 20261013_invite_password_gate.sql.
-- Supabase invitation users already have an internal password hash. Therefore
-- activation must rely on a server-owned marker written only when that hash
-- changes during an actual password update.


create or replace function app_private.mark_invite_password_set()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.invited_at is not null
    and old.encrypted_password is distinct from new.encrypted_password then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'invite_password_set', true,
        'invite_password_set_at', clock_timestamp()
      );
  end if;
  return new;
end;
$$;

drop trigger if exists app_mark_invite_password_set on auth.users;
create trigger app_mark_invite_password_set
before update of encrypted_password on auth.users
for each row
execute function app_private.mark_invite_password_set();

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

  select
    lower(u.email),
    u.email_confirmed_at,
    coalesce((u.raw_app_meta_data ->> 'invite_password_set')::boolean, false)
  into strict v_email, v_email_confirmed_at, v_password_was_set
  from auth.users u
  where u.id = v_user_id;

  if v_email_confirmed_at is null then
    raise exception 'verified email required' using errcode = '42501';
  end if;
  if not v_password_was_set then
    raise exception 'password setup required' using errcode = '42501';
  end if;

  select * into v_invite
  from public.app_invites i
  where i.id = p_invite_id
  for update;

  if not found
    or v_invite.accepted_at is not null
    or v_invite.revoked_at is not null
    or v_invite.expires_at <= clock_timestamp()
    or lower(v_invite.email) is distinct from v_email
    or v_invite.role not in ('owner', 'employee') then
    raise exception 'invitation is invalid, expired, used, or belongs to another account'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.app_companies c
    where c.id = v_invite.company_id and c.active
  ) then
    raise exception 'company is not active' using errcode = '42501';
  end if;

  if v_invite.role = 'owner' and exists (
    select 1 from public.app_members m
    where m.company_id = v_invite.company_id and m.role = 'owner' and m.active
  ) then
    raise exception 'company already has an active owner' using errcode = '42501';
  end if;

  insert into public.app_members(company_id, user_id, name, email, role, active)
  values(v_invite.company_id, v_user_id, v_invite.name, v_email, v_invite.role, true)
  on conflict(company_id, user_id) do update
    set name = excluded.name,
        email = excluded.email,
        role = excluded.role,
        active = true;

  update public.app_invites
  set accepted_at = clock_timestamp(), accepted_by = v_user_id
  where id = v_invite.id;

  insert into public.app_platform_audit_events(
    actor_user_id, action, company_id, target_id, outcome, reason_code
  ) values (
    v_user_id, 'company_invite.accepted', v_invite.company_id, v_invite.id,
    'allowed', 'verified_invitation_with_password'
  );

  return jsonb_build_object(
    'companyId', v_invite.company_id,
    'userId', v_user_id,
    'role', v_invite.role
  );
end;
$$;

revoke all on function app_private.mark_invite_password_set() from public, anon, authenticated;
revoke all on function app_private.accept_invite(uuid) from public, anon, authenticated;
revoke all on function public.app_accept_invite(uuid) from public, anon, authenticated;
grant execute on function public.app_accept_invite(uuid) to authenticated;

-- Source supabase/staging/20261016_legal_consent_contract.sql
-- SHA256 01af8707a54117217607c47e0158e9578a784345ba648eb914b452a67ec75193
-- STAGING-ONLY PROPOSAL. Do not apply automatically and never apply to production.
-- Prerequisites: 20261012_platform_company_onboarding.sql and 20261013_invite_password_proof.sql.
-- Captures server-time evidence for the two agreements; client timestamp is validated but never trusted as the audit timestamp.


alter table public.app_invites
  add column if not exists accepted_by uuid references auth.users(id) on delete set null;

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
grant execute on function app_private.record_owner_legal_consent(uuid, timestamptz) to authenticated;
grant execute on function public.app_record_owner_legal_consent(uuid, timestamptz) to authenticated;
grant execute on function app_private.accept_invite(uuid) to authenticated;
grant execute on function public.app_accept_invite(uuid) to authenticated;
grant execute on function public.app_platform_create_company_onboarding(uuid, text, text, text, text, text, timestamptz, timestamptz) to service_role;

-- Source supabase/staging/20261103_invitation_outbox.sql
-- SHA256 cfaf04aecef75015097bb001f611bec53ec7a77ed446fe68f764266cc7f1521e
-- STAGING-ONLY PROPOSAL. Review against a fresh schema snapshot before applying.
-- Keeps generated one-time Auth links encrypted at rest and out of browser access.
-- Review the platform write-support, onboarding, invite password, and legal-consent
-- contracts before rollout. Check the required schema before changing the outbox.

do $$
begin
  if to_regclass('public.app_email_outbox') is null or to_regclass('public.app_invites') is null then
    raise exception 'Expected app_email_outbox and app_invites before adding invitation delivery.';
  end if;
  if to_regclass('public.app_company_legal_acceptances') is null
    or to_regclass('public.app_platform_audit_events') is null
    or to_regclass('public.app_platform_admins') is null
    or to_regprocedure('public.app_role(uuid)') is null then
    raise exception 'Platform onboarding and legal-consent prerequisites are missing; no changes applied.';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_platform_audit_events' and column_name='target_id')
    or exists (
      select required.column_name from (values
        ('company_id'), ('invite_id'), ('actor_user_id'), ('agreement'),
        ('capture_source'), ('client_accepted_at')
      ) as required(column_name)
      except
      select column_name from information_schema.columns
      where table_schema='public' and table_name='app_company_legal_acceptances'
    ) then
    raise exception 'Platform audit or legal-consent columns differ from the reviewed contract; no changes applied.';
  end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_invites' and column_name='expires_at')
    or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_invites' and column_name='accepted_at')
    or not exists (select 1 from information_schema.columns where table_schema='public' and table_name='app_invites' and column_name='role') then
    raise exception 'app_invites differs from the reviewed contract; no changes applied.';
  end if;
end;
$$;

alter table public.app_invites add column if not exists revoked_at timestamptz;

alter table public.app_email_outbox
  add column if not exists notification_kind text not null default 'email',
  add column if not exists invite_id uuid references public.app_invites(id) on delete cascade,
  add column if not exists template_data jsonb not null default '{}'::jsonb,
  add column if not exists invite_link_ciphertext text,
  add column if not exists invite_link_expires_at timestamptz,
  add column if not exists invite_link_lock_id uuid,
  add column if not exists invite_link_lock_until timestamptz,
  add column if not exists payload_generation integer not null default 1;

do $$
begin
  if not exists (select 1 from pg_constraint where conrelid='public.app_email_outbox'::regclass and conname='app_email_outbox_notification_kind_check') then
    alter table public.app_email_outbox add constraint app_email_outbox_notification_kind_check
      check (notification_kind in ('email', 'auth_invite'));
  end if;
  if not exists (select 1 from pg_constraint where conrelid='public.app_email_outbox'::regclass and conname='app_email_outbox_payload_generation_check') then
    alter table public.app_email_outbox add constraint app_email_outbox_payload_generation_check check (payload_generation > 0);
  end if;
end;
$$;

create unique index if not exists app_email_outbox_invite_unique
  on public.app_email_outbox(invite_id) where notification_kind='auth_invite';
create index if not exists app_email_outbox_invite_expiry_idx
  on public.app_email_outbox(status, invite_link_expires_at) where notification_kind='auth_invite';

alter table public.app_email_outbox enable row level security;
do $$
declare policy_row record;
begin
  for policy_row in select policyname from pg_policies where schemaname='public' and tablename='app_email_outbox' loop
    execute format('drop policy %I on public.app_email_outbox', policy_row.policyname);
  end loop;
end;
$$;
revoke all on table public.app_email_outbox from public, anon, authenticated;
grant select, insert, update on table public.app_email_outbox to service_role;

-- Return truthful onboarding status from the pending invite and its outbox row.
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
    where a.user_id=p_actor_user_id and a.active=true and a.revoked_at is null
  ) then raise exception 'active platform administrator required' using errcode='42501'; end if;

  return query
  select c.id, c.name, c.slug, c.active, c.onboarding_completed, c.created_at,
    count(distinct m.user_id) filter (where m.active=true)::bigint,
    coalesce(nullif(c.subscription_status,''),'not_configured')::text,
    case
      when bool_or(i.accepted_at is not null) then 'accepted'::text
      when bool_or(o.last_error in ('AUTH_INVITE_USER_REVIEW_REQUIRED','AUTH_INVITE_SCOPE_MISMATCH')) then 'review_required'::text
      when bool_or(o.status in ('delivered','sent')) then 'sent'::text
      when bool_or(o.status in ('pending','retry','processing','sending')) then 'queued'::text
      when bool_or(o.status='failed') then 'failed'::text
      else 'not_sent'::text
    end,
    min(l.created_at)
  from public.app_companies c
  left join public.app_members m on m.company_id=c.id
  left join public.app_invites i on i.company_id=c.id and i.role='owner' and i.revoked_at is null
  left join public.app_email_outbox o on o.invite_id=i.id and o.notification_kind='auth_invite'
  left join public.app_leads l on l.company_id=c.id
  group by c.id,c.name,c.slug,c.active,c.onboarding_completed,c.created_at,c.subscription_status
  order by c.created_at desc;
end;
$$;
revoke all on function public.app_platform_list_companies(uuid) from public, anon, authenticated;
grant execute on function public.app_platform_list_companies(uuid) to service_role;

-- Create employee invite and outbox row in one transaction so a process exit
-- cannot leave a successful invite without a durable delivery job.
create or replace function public.app_create_invite(p_company_id uuid, p_email text, p_name text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare v_id uuid; v_email text := lower(trim(coalesce(p_email,''))); v_name text := substr(trim(coalesce(p_name,'')),1,160); v_company_name text;
begin
  if public.app_role(p_company_id) is distinct from 'owner' then raise exception 'owner membership required' using errcode='42501'; end if;
  if v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or v_name='' then raise exception 'invalid invite identity' using errcode='22023'; end if;
  select c.name into v_company_name from public.app_companies c where c.id=p_company_id and c.active=true;
  if v_company_name is null then raise exception 'active company required' using errcode='P0002'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_company_id::text || ':' || v_email,0));
  select i.id into v_id from public.app_invites i
  where i.company_id=p_company_id and lower(i.email)=v_email and i.role='employee' and i.accepted_at is null
    and i.revoked_at is null and i.expires_at>clock_timestamp()
  order by i.created_at desc limit 1;
  if v_id is null then
    insert into public.app_invites(company_id,email,name,role,expires_at)
    values(p_company_id,v_email,v_name,'employee',clock_timestamp()+interval '7 days') returning id into v_id;
  end if;
  update public.app_email_outbox as o set recipient=v_email,subject='Pozvánka do StavbaFlow',
    template_data=jsonb_build_object('name',v_name,'company_name',v_company_name,'role','employee'),
    status='pending',attempts=0,scheduled_for=clock_timestamp(),last_error=null,
    invite_link_ciphertext=null,invite_link_expires_at=null,invite_link_lock_id=null,invite_link_lock_until=null,
    payload_generation=o.payload_generation+1,updated_at=clock_timestamp()
  where o.invite_id=v_id and o.notification_kind='auth_invite'
    and o.status in ('failed','delivered','sent')
    and o.last_error is distinct from 'OUTBOX_DELIVERY_STATE_UNKNOWN'
    and o.last_error is distinct from 'AUTH_INVITE_USER_REVIEW_REQUIRED'
    and o.last_error is distinct from 'AUTH_INVITE_SCOPE_MISMATCH';
  if not found then
    insert into public.app_email_outbox(company_id,invite_id,notification_kind,recipient,subject,template_data,status,attempts,scheduled_for,payload_generation)
    values(p_company_id,v_id,'auth_invite',v_email,'Pozvánka do StavbaFlow',jsonb_build_object('name',v_name,'company_name',v_company_name,'role','employee'),'pending',0,clock_timestamp(),1)
    on conflict do nothing;
  end if;
  return v_id;
end;
$$;
revoke all on function public.app_create_invite(uuid,text,text) from public, anon;
grant execute on function public.app_create_invite(uuid,text,text) to authenticated;

-- Preserve the legal-consent contract and queue platform owner delivery in the
-- same transaction that creates the company, invite, consent evidence and audit.
create or replace function public.app_platform_create_company_onboarding(
  p_actor_user_id uuid, p_name text, p_slug text, p_owner_name text, p_owner_email text,
  p_plan text default 'pilot', p_terms_accepted_at timestamptz default null, p_dpa_accepted_at timestamptz default null
)
returns table(company_id uuid, invite_id uuid, slug text)
language plpgsql security definer set search_path = ''
as $$
declare v_company_id uuid; v_invite_id uuid; v_slug text:=lower(trim(coalesce(p_slug,''))); v_email text:=lower(trim(coalesce(p_owner_email,'')));
begin
  if p_actor_user_id is null or not exists(select 1 from public.app_platform_admins a where a.user_id=p_actor_user_id and a.active and a.revoked_at is null) then
    raise exception 'active platform administrator required' using errcode='42501';
  end if;
  if p_terms_accepted_at is null or p_dpa_accepted_at is null
    or p_terms_accepted_at < clock_timestamp()-interval '15 minutes' or p_dpa_accepted_at < clock_timestamp()-interval '15 minutes'
    or p_terms_accepted_at > clock_timestamp()+interval '2 minutes' or p_dpa_accepted_at > clock_timestamp()+interval '2 minutes' then
    raise exception 'legal consent required' using errcode='22023';
  end if;
  if char_length(trim(coalesce(p_name,''))) not between 2 and 160 or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug)>80
    or char_length(trim(coalesce(p_owner_name,''))) not between 2 and 160
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(v_email)>254
    or coalesce(p_plan,'pilot')<>'pilot' then raise exception 'invalid onboarding input' using errcode='22023'; end if;
  insert into public.app_companies(name,slug,email,plan,public_form,onboarding_completed)
  values(trim(p_name),v_slug,v_email,'pilot',true,false) returning id into v_company_id;
  insert into public.app_invites(company_id,email,name,role,expires_at)
  values(v_company_id,v_email,trim(p_owner_name),'owner',clock_timestamp()+interval '7 days') returning id into v_invite_id;
  insert into public.app_company_legal_acceptances(company_id,invite_id,actor_user_id,agreement,capture_source,client_accepted_at) values
    (v_company_id,v_invite_id,p_actor_user_id,'terms_of_service','platform_company_onboarding',p_terms_accepted_at),
    (v_company_id,v_invite_id,p_actor_user_id,'data_processing_agreement','platform_company_onboarding',p_dpa_accepted_at);
  insert into public.app_email_outbox(company_id,invite_id,notification_kind,recipient,subject,template_data,status,attempts,scheduled_for,payload_generation)
  values(v_company_id,v_invite_id,'auth_invite',v_email,'Pozvánka do StavbaFlow',jsonb_build_object('name',trim(p_owner_name),'company_name',trim(p_name),'role','owner'),'pending',0,clock_timestamp(),1);
  insert into public.app_platform_audit_events(actor_user_id,action,company_id,target_id,outcome,reason_code)
  values(p_actor_user_id,'company_onboarding.created',v_company_id,v_invite_id,'allowed','platform_admin_request_with_legal_consent');
  return query select v_company_id,v_invite_id,v_slug;
end;
$$;
revoke all on function public.app_platform_create_company_onboarding(uuid,text,text,text,text,text,timestamptz,timestamptz) from public,anon,authenticated;
grant execute on function public.app_platform_create_company_onboarding(uuid,text,text,text,text,text,timestamptz,timestamptz) to service_role;

-- Reissue and queue as a single transaction; keep prior invite history revoked.
create or replace function public.app_platform_resend_owner_invite(p_actor_user_id uuid,p_company_id uuid)
returns table(invite_id uuid,owner_email text,owner_name text)
language plpgsql security definer set search_path = ''
as $$
declare v_email text; v_name text; v_company_name text; v_invite_id uuid;
begin
  if not exists(select 1 from public.app_platform_admins a where a.user_id=p_actor_user_id and a.active and a.revoked_at is null) then raise exception 'active platform administrator required' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('owner-resend:' || p_company_id::text,0));
  if exists(select 1 from public.app_members m where m.company_id=p_company_id and m.role='owner' and m.active) then raise exception 'owner already active' using errcode='22023'; end if;
  select i.id,i.email,i.name,c.name into v_invite_id,v_email,v_name,v_company_name from public.app_invites i join public.app_companies c on c.id=i.company_id
  where i.company_id=p_company_id and i.role='owner' and i.accepted_at is null and i.revoked_at is null and i.expires_at>clock_timestamp()
  order by i.created_at desc limit 1;
  if v_email is null or v_company_name is null then
    select i.email,i.name,c.name into v_email,v_name,v_company_name from public.app_invites i join public.app_companies c on c.id=i.company_id
    where i.company_id=p_company_id and i.role='owner' order by i.created_at desc limit 1;
    if v_email is null or v_company_name is null then raise exception 'owner invite not found' using errcode='P0002'; end if;
    update public.app_invites i set revoked_at=clock_timestamp() where i.company_id=p_company_id and i.role='owner' and i.accepted_at is null and i.revoked_at is null;
    insert into public.app_invites(company_id,email,name,role,expires_at) values(p_company_id,v_email,v_name,'owner',clock_timestamp()+interval '7 days') returning id into v_invite_id;
  end if;
  update public.app_email_outbox as o set recipient=v_email,subject='Pozvánka do StavbaFlow',
    template_data=jsonb_build_object('name',v_name,'company_name',v_company_name,'role','owner'),
    status='pending',attempts=0,scheduled_for=clock_timestamp(),last_error=null,
    invite_link_ciphertext=null,invite_link_expires_at=null,invite_link_lock_id=null,invite_link_lock_until=null,
    payload_generation=o.payload_generation+1,updated_at=clock_timestamp()
  where o.invite_id=v_invite_id and o.notification_kind='auth_invite'
    and o.status in ('failed','delivered','sent')
    and o.last_error is distinct from 'OUTBOX_DELIVERY_STATE_UNKNOWN'
    and o.last_error is distinct from 'AUTH_INVITE_USER_REVIEW_REQUIRED'
    and o.last_error is distinct from 'AUTH_INVITE_SCOPE_MISMATCH';
  if not found then
    insert into public.app_email_outbox(company_id,invite_id,notification_kind,recipient,subject,template_data,status,attempts,scheduled_for,payload_generation)
    values(p_company_id,v_invite_id,'auth_invite',v_email,'Pozvánka do StavbaFlow',jsonb_build_object('name',v_name,'company_name',v_company_name,'role','owner'),'pending',0,clock_timestamp(),1)
    on conflict do nothing;
  end if;
  insert into public.app_platform_audit_events(actor_user_id,action,company_id,target_id,outcome,reason_code)
  values(p_actor_user_id,'company_invite.resent',p_company_id,v_invite_id,'allowed','platform_admin_request');
  return query select v_invite_id,v_email,v_name;
end;
$$;
revoke all on function public.app_platform_resend_owner_invite(uuid,uuid) from public,anon,authenticated;
grant execute on function public.app_platform_resend_owner_invite(uuid,uuid) to service_role;

commit;
