-- REVIEW REQUIRED — apply only to the isolated staging project after SQL review.
-- Adds the monthly Profi plan and stops new Founding Pilot subscriptions.
begin;

alter table public.app_paid_registration_intents
  drop constraint if exists app_paid_registration_intents_plan_check;
alter table public.app_paid_registration_intents
  add constraint app_paid_registration_intents_plan_check
  check (plan in ('pilot', 'starter', 'growth', 'pro')) not valid;
alter table public.app_paid_registration_intents
  validate constraint app_paid_registration_intents_plan_check;

-- Remove the old callable signature so a stale service caller cannot create a
-- new intent without an explicitly allowlisted monthly plan.
revoke all on function public.app_prepare_paid_registration(uuid,uuid,text,text,text,timestamptz)
  from public, anon, authenticated, service_role;
drop function public.app_prepare_paid_registration(uuid,uuid,text,text,text,timestamptz);

create or replace function public.app_prepare_paid_registration(
  p_user_id uuid,
  p_request_id uuid,
  p_name text,
  p_slug text,
  p_owner_name text,
  p_client_accepted_at timestamptz,
  p_plan text
) returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v public.app_paid_registration_intents;
  v_email text;
  v_confirmed timestamptz;
begin
  if p_user_id is null or p_request_id is null
    or p_name is null or length(trim(p_name)) not between 1 and 160
    or p_owner_name is null or length(trim(p_owner_name)) not between 1 and 160
    or p_slug is null or p_slug !~ '^[a-z0-9][a-z0-9-]{2,79}$'
    or p_plan is null or p_plan not in ('starter', 'growth', 'pro') then
    raise exception 'invalid registration' using errcode = '22023';
  end if;

  select lower(email), email_confirmed_at
    into v_email, v_confirmed
    from auth.users where id = p_user_id for update;
  if v_confirmed is null then
    raise exception 'verified identity required' using errcode = '42501';
  end if;

  select * into v from public.app_paid_registration_intents where owner_user_id = p_user_id;
  if found then
    if v.request_id is distinct from p_request_id
      or v.company_name is distinct from trim(p_name)
      or v.owner_name is distinct from trim(p_owner_name)
      or v.slug is distinct from p_slug
      or v.plan is distinct from p_plan
      or v.client_accepted_at is distinct from p_client_accepted_at
      or v.expires_at <= clock_timestamp() then
      raise exception 'registration retry mismatch or expired' using errcode = '23505';
    end if;
    return to_jsonb(v);
  end if;

  if p_client_accepted_at is null
    or p_client_accepted_at < clock_timestamp() - interval '15 minutes'
    or p_client_accepted_at > clock_timestamp() + interval '2 minutes' then
    raise exception 'current legal agreements required' using errcode = '22023';
  end if;
  if exists(select 1 from public.app_members where user_id = p_user_id and active) then
    raise exception 'existing member' using errcode = '42501';
  end if;
  if exists(select 1 from public.app_companies where slug = p_slug) then
    raise exception 'company slug unavailable' using errcode = '23505';
  end if;

  insert into public.app_paid_registration_intents(
    owner_user_id, owner_email, owner_name, company_name, slug, plan, request_id, client_accepted_at
  ) values (
    p_user_id, v_email, trim(p_owner_name), trim(p_name), p_slug, p_plan, p_request_id, p_client_accepted_at
  ) returning * into v;
  return to_jsonb(v);
end;
$$;
revoke all on function public.app_prepare_paid_registration(uuid,uuid,text,text,text,timestamptz,text)
  from public, anon, authenticated;
grant execute on function public.app_prepare_paid_registration(uuid,uuid,text,text,text,timestamptz,text)
  to service_role;

create or replace function public.app_platform_set_billing_plan(
  p_actor_user_id uuid,
  p_company_id uuid,
  p_plan text
)
returns table(company_id uuid, plan text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan text := lower(trim(coalesce(p_plan, '')));
begin
  if p_actor_user_id is null or not exists (
    select 1 from public.app_platform_admins a
    where a.user_id = p_actor_user_id and a.active = true and a.revoked_at is null
  ) then
    raise exception 'active platform administrator required' using errcode = '42501';
  end if;
  if v_plan not in ('pilot', 'starter', 'growth', 'pro') then
    raise exception 'unsupported billing plan' using errcode = '22023';
  end if;
  perform 1 from public.app_companies c where c.id = p_company_id and c.active = true for update;
  if not found then raise exception 'active company not found' using errcode = 'P0002'; end if;
  update public.app_companies c set plan = v_plan where c.id = p_company_id;
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, outcome, reason_code)
  values (p_actor_user_id, 'billing_plan.updated', p_company_id, 'allowed', 'platform_api_request');
  return query select p_company_id, v_plan;
end;
$$;
revoke all on function public.app_platform_set_billing_plan(uuid,uuid,text) from public, anon, authenticated;
grant execute on function public.app_platform_set_billing_plan(uuid,uuid,text) to service_role;

commit;
