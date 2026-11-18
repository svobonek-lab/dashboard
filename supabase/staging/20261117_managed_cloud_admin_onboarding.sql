-- STAGING-ONLY REVIEW PROPOSAL. Apply only after separate review.
-- This replaces the current private-form, legal-consent, outbox transaction.
begin;

do $$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.app_platform_create_company_onboarding(uuid,text,text,text,text,text,timestamptz,timestamptz)'::regprocedure);
  if position('coalesce(p_plan,''pilot'')<>''pilot''' in definition) = 0
    or position('values(trim(p_name),v_slug,v_email,''pilot'',false,false)' in definition) = 0 then
    raise exception 'staging onboarding RPC differs from reviewed pilot/private-form baseline';
  end if;
  if (select column_default from information_schema.columns
      where table_schema = 'public' and table_name = 'app_companies' and column_name = 'subscription_status')
      is distinct from '''not_configured''::text' then
    raise exception 'new-company entitlement default differs from reviewed baseline';
  end if;
  if (select pg_get_constraintdef(oid) from pg_constraint
      where conrelid = 'public.app_companies'::regclass and conname = 'app_companies_plan_check')
      is distinct from 'CHECK ((plan = ANY (ARRAY[''pilot''::text, ''starter''::text, ''business''::text])))' then
    raise exception 'company plan constraint differs from reviewed staging baseline';
  end if;
end;
$$;

alter table public.app_companies drop constraint app_companies_plan_check;
alter table public.app_companies add constraint app_companies_plan_check
  check (plan in ('pilot', 'starter', 'growth', 'pro', 'business')) not valid;
alter table public.app_companies validate constraint app_companies_plan_check;

create or replace function public.app_platform_create_company_onboarding(
  p_actor_user_id uuid, p_name text, p_slug text, p_owner_name text, p_owner_email text,
  p_plan text default null, p_terms_accepted_at timestamptz default null, p_dpa_accepted_at timestamptz default null
)
returns table(company_id uuid, invite_id uuid, slug text)
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
    where a.user_id = p_actor_user_id and a.active and a.revoked_at is null
  ) then
    raise exception 'active platform administrator required' using errcode = '42501';
  end if;
  if p_terms_accepted_at is null or p_dpa_accepted_at is null
    or p_terms_accepted_at < clock_timestamp() - interval '15 minutes'
    or p_dpa_accepted_at < clock_timestamp() - interval '15 minutes'
    or p_terms_accepted_at > clock_timestamp() + interval '2 minutes'
    or p_dpa_accepted_at > clock_timestamp() + interval '2 minutes' then
    raise exception 'legal consent required' using errcode = '22023';
  end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 160
    or v_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$' or char_length(v_slug) > 80
    or char_length(trim(coalesce(p_owner_name, ''))) not between 2 and 160
    or v_email !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' or char_length(v_email) > 254
    or p_plan not in ('starter', 'growth', 'pro') or p_plan is null then
    raise exception 'invalid onboarding input' using errcode = '22023';
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(v_email, 0));
  if exists (select 1 from auth.users u where lower(u.email) = v_email)
    or exists (select 1 from public.app_companies c where lower(c.email) = v_email) then
    raise exception 'owner email already registered' using errcode = 'P0001';
  end if;

  insert into public.app_companies(name, slug, email, plan, subscription_status, public_form, onboarding_completed)
  values(trim(p_name), v_slug, v_email, p_plan, 'not_configured', false, false)
  returning id into v_company_id;
  insert into public.app_invites(company_id, email, name, role, expires_at)
  values(v_company_id, v_email, trim(p_owner_name), 'owner', clock_timestamp() + interval '7 days')
  returning id into v_invite_id;
  insert into public.app_company_legal_acceptances(company_id, invite_id, actor_user_id, agreement, capture_source, client_accepted_at)
  values
    (v_company_id, v_invite_id, p_actor_user_id, 'terms_of_service', 'platform_company_onboarding', p_terms_accepted_at),
    (v_company_id, v_invite_id, p_actor_user_id, 'data_processing_agreement', 'platform_company_onboarding', p_dpa_accepted_at);
  insert into public.app_email_outbox(company_id, invite_id, notification_kind, recipient, subject, template_data, status, attempts, scheduled_for, payload_generation)
  values(v_company_id, v_invite_id, 'auth_invite', v_email, 'Pozvánka do StavbaFlow',
    jsonb_build_object('name', trim(p_owner_name), 'company_name', trim(p_name), 'role', 'owner'),
    'pending', 0, clock_timestamp(), 1);
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, target_id, outcome, reason_code)
  values(p_actor_user_id, 'company_onboarding.created', v_company_id, v_invite_id,
    'allowed', 'platform_admin_request_with_legal_consent');
  return query select v_company_id, v_invite_id, v_slug;
end;
$$;

revoke all on function public.app_platform_create_company_onboarding(uuid,text,text,text,text,text,timestamptz,timestamptz)
  from public, anon, authenticated;
grant execute on function public.app_platform_create_company_onboarding(uuid,text,text,text,text,text,timestamptz,timestamptz)
  to service_role;

commit;
