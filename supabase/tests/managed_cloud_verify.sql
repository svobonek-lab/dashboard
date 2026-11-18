\set ON_ERROR_STOP on

do $$
declare
  v_company uuid;
  v_invite uuid;
  v_second uuid;
  v_status text;
  v_checkout_time timestamptz := date_trunc('second', clock_timestamp());
begin
  select company_id, invite_id into v_company, v_invite
  from public.app_platform_create_company_onboarding(
    '30000000-0000-4000-8000-000000000003', 'Synthetic One', 'synthetic-one',
    'Owner One', 'owner-one@example.invalid', 'starter', clock_timestamp(), clock_timestamp());
  if v_company is null or v_invite is null then raise exception 'PAID_COMPANY_NOT_CREATED'; end if;
  if not exists (select 1 from public.app_companies where id = v_company and plan = 'starter'
      and subscription_status = 'not_configured' and public_form = false) then
    raise exception 'PAID_COMPANY_STATE_INVALID';
  end if;
  if not exists (select 1 from public.app_email_outbox where company_id = v_company
      and invite_id = v_invite and status = 'pending' and notification_kind = 'auth_invite') then
    raise exception 'OWNER_INVITE_NOT_QUEUED';
  end if;
  if (select count(*) from public.app_company_legal_acceptances where company_id = v_company) <> 2
    or not exists (select 1 from public.app_platform_audit_events
      where company_id = v_company and action = 'company_onboarding.created') then
    raise exception 'ONBOARDING_AUDIT_INCOMPLETE';
  end if;

  begin
    perform public.app_platform_create_company_onboarding(
      '30000000-0000-4000-8000-000000000003', 'Duplicate', 'duplicate-owner',
      'Owner One', 'owner-one@example.invalid', 'starter', clock_timestamp(), clock_timestamp());
    raise exception 'DUPLICATE_EMAIL_ACCEPTED' using errcode = 'PT999';
  exception when sqlstate 'P0001' then null;
  end;
  if exists (select 1 from public.app_companies where slug = 'duplicate-owner') then
    raise exception 'DUPLICATE_COMPANY_PERSISTED';
  end if;
  begin
    perform public.app_platform_create_company_onboarding(
      '30000000-0000-4000-8000-000000000003', 'Pilot', 'pilot-forbidden',
      'Owner Pilot', 'owner-pilot@example.invalid', 'pilot', clock_timestamp(), clock_timestamp());
    raise exception 'PILOT_PLAN_ACCEPTED';
  exception when sqlstate '22023' then null;
  end;

  select public.app_apply_stripe_subscription_event(
    'evt_early_update', 'customer.subscription.updated', v_checkout_time, v_company,
    'cus_synthetic_one', 'sub_synthetic_one', 'active', null) into v_status;
  if v_status <> 'stale' or (select subscription_status from public.app_companies where id = v_company) <> 'not_configured' then
    raise exception 'EARLY_SUBSCRIPTION_ACTIVATED';
  end if;
  select public.app_apply_stripe_subscription_event(
    'evt_legacy_checkout', 'checkout.session.completed', clock_timestamp(), v_company,
    'cus_synthetic_one', 'sub_synthetic_one', 'active', null) into v_status;
  if v_status <> 'stale' or (select subscription_status from public.app_companies where id = v_company) <> 'not_configured' then
    raise exception 'LEGACY_CHECKOUT_ACTIVATED';
  end if;

  update public.app_companies set stripe_customer_id = 'cus_synthetic_one' where id = v_company;
  insert into auth.users(id,email) values('40000000-0000-4000-8000-000000000004','owner-one@example.invalid');
  insert into public.app_members(company_id,user_id,role) values(v_company,'40000000-0000-4000-8000-000000000004','owner');
  update public.app_invites set accepted_at = clock_timestamp() where id = v_invite;
  select public.app_activate_paid_checkout(
    'evt_unpaid_checkout', clock_timestamp(), v_company, 'cus_synthetic_one', 'sub_synthetic_one',
    'cs_synthetic_unpaid', 'no_payment_required', 'starter') into v_status;
  if v_status <> 'stale' or (select subscription_status from public.app_companies where id = v_company) <> 'not_configured' then
    raise exception 'NO_PAYMENT_ACTIVATED';
  end if;
  select public.app_activate_paid_checkout(
    'evt_paid_checkout', v_checkout_time, v_company, 'cus_synthetic_one', 'sub_synthetic_one',
    'cs_synthetic_paid', 'paid', 'starter') into v_status;
  if v_status <> 'applied' or (select subscription_status from public.app_companies where id = v_company) <> 'active'
    or not exists (select 1 from public.app_first_checkout_activations where company_id = v_company and event_id = 'evt_paid_checkout')
    or not exists (select 1 from public.app_platform_audit_events where company_id = v_company and action = 'company_subscription.activated') then
    raise exception 'PAID_CHECKOUT_NOT_ACTIVATED_ATOMICALLY';
  end if;
  if public.app_activate_paid_checkout(
    'evt_paid_checkout', clock_timestamp(), v_company, 'cus_synthetic_one', 'sub_synthetic_one',
    'cs_synthetic_paid', 'paid', 'starter') <> 'duplicate' then
    raise exception 'PAID_CHECKOUT_REPLAY_NOT_IDEMPOTENT';
  end if;

  select company_id into v_second from public.app_platform_create_company_onboarding(
    '30000000-0000-4000-8000-000000000003', 'Synthetic Two', 'synthetic-two',
    'Owner Two', 'owner-two@example.invalid', 'growth', clock_timestamp(), clock_timestamp());
  update public.app_companies set stripe_customer_id = 'cus_synthetic_two' where id = v_second;
  begin
    perform public.app_activate_paid_checkout(
      'evt_wrong_company', clock_timestamp(), v_second, 'cus_synthetic_one', 'sub_synthetic_one',
      'cs_wrong_company', 'paid', 'growth');
    raise exception 'WRONG_COMPANY_ACTIVATED';
  exception when sqlstate '23505' then null;
  end;
  if (select subscription_status from public.app_companies where id = v_second) <> 'not_configured' then
    raise exception 'WRONG_COMPANY_CHANGED_ENTITLEMENT';
  end if;
  insert into auth.users(id,email) values('50000000-0000-4000-8000-000000000005','owner-two@example.invalid');
  insert into public.app_members(company_id,user_id,role) values(v_second,'50000000-0000-4000-8000-000000000005','owner');
  update public.app_invites set accepted_at = clock_timestamp() where company_id = v_second;
  select public.app_apply_stripe_subscription_event(
    'evt_later_past_due', 'customer.subscription.updated', v_checkout_time, v_second,
    'cus_synthetic_two', 'sub_synthetic_two', 'past_due', null) into v_status;
  if v_status <> 'stale' then raise exception 'EARLY_PAST_DUE_NOT_RECORDED'; end if;
  select public.app_activate_paid_checkout(
    'evt_paid_before_past_due', v_checkout_time, v_second, 'cus_synthetic_two', 'sub_synthetic_two',
    'cs_synthetic_two', 'paid', 'growth') into v_status;
  if v_status <> 'stale' or (select subscription_status from public.app_companies where id = v_second) <> 'not_configured' then
    raise exception 'LATER_PAST_DUE_WAS_OVERRIDDEN';
  end if;
end;
$$;
