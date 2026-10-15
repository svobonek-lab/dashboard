\set ON_ERROR_STOP on

set role service_role;

do $$
declare
  v_result text;
begin
  select public.app_apply_stripe_subscription_event(
    'evt_checkout_a', 'checkout.session.completed', '2026-10-15T10:00:00Z',
    '10000000-0000-4000-8000-000000000001', 'cus_a', 'sub_a', 'active', null
  ) into v_result;
  if v_result <> 'applied' then raise exception 'checkout was not applied'; end if;

  if not exists (
    select 1 from public.app_companies
    where id = '10000000-0000-4000-8000-000000000001'
      and subscription_status = 'active'
      and stripe_customer_id = 'cus_a'
      and stripe_subscription_id = 'sub_a'
  ) then raise exception 'tenant Stripe binding was not persisted'; end if;

  select public.app_apply_stripe_subscription_event(
    'evt_checkout_a', 'checkout.session.completed', '2026-10-15T10:00:00Z',
    '10000000-0000-4000-8000-000000000001', 'cus_a', 'sub_a', 'past_due', null
  ) into v_result;
  if v_result <> 'duplicate' then raise exception 'duplicate event was not ignored'; end if;

  if (select subscription_status from public.app_companies where id = '10000000-0000-4000-8000-000000000001') <> 'active'
  then raise exception 'duplicate event mutated the tenant'; end if;

  select public.app_apply_stripe_subscription_event(
    'evt_update_a', 'customer.subscription.updated', '2026-10-15T11:00:00Z',
    null, 'cus_a', 'sub_a', 'past_due', '2026-11-15T00:00:00Z'
  ) into v_result;
  if v_result <> 'applied' then raise exception 'subscription update was not applied'; end if;

  select public.app_apply_stripe_subscription_event(
    'evt_stale_a', 'customer.subscription.updated', '2026-10-15T10:30:00Z',
    null, 'cus_a', 'sub_a', 'active', '2026-12-15T00:00:00Z'
  ) into v_result;
  if v_result <> 'stale' then raise exception 'stale event was not ignored'; end if;

  if (select subscription_status from public.app_companies where id = '10000000-0000-4000-8000-000000000001') <> 'past_due'
  then raise exception 'stale event rolled the subscription backward'; end if;

  begin
    perform public.app_apply_stripe_subscription_event(
      'evt_cross_tenant', 'checkout.session.completed', '2026-10-15T12:00:00Z',
      '20000000-0000-4000-8000-000000000002', 'cus_a', 'sub_a', 'active', null
    );
    raise exception 'cross-tenant Stripe customer binding unexpectedly succeeded';
  exception when unique_violation then
    null;
  end;

  if (select stripe_customer_id from public.app_companies where id = '20000000-0000-4000-8000-000000000002') is not null
  then raise exception 'cross-tenant event mutated company B'; end if;

  select public.app_apply_stripe_subscription_event(
    'evt_deleted_a', 'customer.subscription.deleted', '2026-10-15T13:00:00Z',
    null, 'cus_a', 'sub_a', 'canceled', '2026-11-15T00:00:00Z'
  ) into v_result;
  if v_result <> 'applied' then raise exception 'subscription deletion was not applied'; end if;

  if (select subscription_status from public.app_companies where id = '10000000-0000-4000-8000-000000000001') <> 'canceled'
  then raise exception 'deleted subscription is not canceled'; end if;
end;
$$;

reset role;
set role authenticated;

do $$
begin
  begin
    perform public.app_apply_stripe_subscription_event(
      'evt_browser', 'checkout.session.completed', now(),
      '10000000-0000-4000-8000-000000000001', 'cus_browser', 'sub_browser', 'active', null
    );
    raise exception 'authenticated browser unexpectedly executed billing RPC';
  exception when insufficient_privilege then
    null;
  end;

  begin
    perform 1 from public.app_stripe_webhook_events;
    raise exception 'authenticated browser unexpectedly read Stripe events';
  exception when insufficient_privilege then
    null;
  end;
end;
$$;

reset role;
