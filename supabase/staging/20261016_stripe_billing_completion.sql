-- STAGING-ONLY REVIEW ARTIFACT — NEVER APPLY AUTOMATICALLY OR TO PRODUCTION.
-- Completes the server-only Stripe customer binding and platform plan choice.
-- Subscription activation remains exclusively in app_apply_stripe_subscription_event.

begin;

create or replace function public.app_bind_stripe_customer(
  p_company_id uuid,
  p_stripe_customer_id text
)
returns table(company_id uuid, stripe_customer_id text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company public.app_companies%rowtype;
  v_customer text := trim(coalesce(p_stripe_customer_id, ''));
begin
  if p_company_id is null or v_customer !~ '^cus_[A-Za-z0-9]+$' then
    raise exception 'invalid Stripe customer binding' using errcode = '22023';
  end if;

  select * into v_company
  from public.app_companies c
  where c.id = p_company_id and c.active = true
  for update;
  if not found then
    raise exception 'active company not found' using errcode = 'P0002';
  end if;
  if v_company.stripe_customer_id is not null
     and v_company.stripe_customer_id <> v_customer then
    raise exception 'company already has a Stripe customer' using errcode = '23505';
  end if;
  if exists (
    select 1 from public.app_companies c
    where c.stripe_customer_id = v_customer and c.id <> p_company_id
  ) then
    raise exception 'Stripe customer already belongs to another company' using errcode = '23505';
  end if;

  update public.app_companies c
  set stripe_customer_id = v_customer
  where c.id = p_company_id and c.stripe_customer_id is null;

  return query select p_company_id, v_customer;
end;
$$;

revoke all on function public.app_bind_stripe_customer(uuid, text) from public, anon, authenticated;
grant execute on function public.app_bind_stripe_customer(uuid, text) to service_role;

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
    where a.user_id = p_actor_user_id
      and a.active = true
      and a.revoked_at is null
  ) then
    raise exception 'active platform administrator required' using errcode = '42501';
  end if;
  if v_plan not in ('pilot', 'starter', 'growth') then
    raise exception 'unsupported billing plan' using errcode = '22023';
  end if;

  perform 1 from public.app_companies c where c.id = p_company_id and c.active = true for update;
  if not found then
    raise exception 'active company not found' using errcode = 'P0002';
  end if;

  update public.app_companies c set plan = v_plan where c.id = p_company_id;
  insert into public.app_platform_audit_events(
    actor_user_id, action, company_id, outcome, reason_code
  ) values (
    p_actor_user_id, 'billing_plan.updated', p_company_id, 'allowed', 'platform_api_request'
  );

  return query select p_company_id, v_plan;
end;
$$;

revoke all on function public.app_platform_set_billing_plan(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.app_platform_set_billing_plan(uuid, uuid, text) to service_role;

commit;
