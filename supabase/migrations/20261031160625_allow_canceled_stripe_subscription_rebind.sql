-- Permit a tenant to re-subscribe after its previous subscription was canceled.
-- The replacement is accepted only from a newer signed Checkout completion for
-- the same Stripe customer. Late events for the old subscription remain stale.
create or replace function public.app_apply_stripe_subscription_event(
  p_event_id text,
  p_event_type text,
  p_event_created_at timestamptz,
  p_tenant_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_subscription_status text,
  p_current_period_end timestamptz
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company public.app_companies%rowtype;
  v_other_company_id uuid;
  v_inserted integer;
  v_result text := 'applied';
begin
  if p_event_id is null or length(p_event_id) not between 5 and 255
    or p_event_type not in ('checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted')
    or p_event_created_at is null
    or p_stripe_customer_id is null or length(p_stripe_customer_id) not between 5 and 255
    or p_stripe_subscription_id is null or length(p_stripe_subscription_id) not between 5 and 255
    or p_subscription_status not in ('active', 'past_due', 'canceled')
  then
    raise exception 'invalid Stripe subscription event' using errcode = '22023';
  end if;

  if exists (select 1 from public.app_stripe_webhook_events e where e.event_id = p_event_id) then
    return 'duplicate';
  end if;

  if p_tenant_id is not null then
    select * into v_company
    from public.app_companies c
    where c.id = p_tenant_id
    for update;
  else
    select * into v_company
    from public.app_companies c
    where c.stripe_customer_id = p_stripe_customer_id
    for update;
  end if;

  if v_company.id is null then
    raise exception 'Stripe tenant binding was not found' using errcode = 'P0002';
  end if;

  select c.id into v_other_company_id
  from public.app_companies c
  where c.stripe_customer_id = p_stripe_customer_id
    and c.id <> v_company.id;
  if v_other_company_id is not null then
    raise exception 'stripe customer is already bound to another tenant' using errcode = '23505';
  end if;

  if v_company.stripe_customer_id is not null
    and v_company.stripe_customer_id <> p_stripe_customer_id
  then
    raise exception 'tenant is already bound to another Stripe customer' using errcode = '23505';
  end if;

  -- Ignore delayed events for the old subscription before checking the binding.
  if v_company.stripe_event_created_at is not null
    and p_event_created_at < v_company.stripe_event_created_at
  then
    v_result := 'stale';
  end if;

  if v_company.stripe_subscription_id is not null
    and v_company.stripe_subscription_id <> p_stripe_subscription_id
    and v_result <> 'stale'
    and not (
      v_company.subscription_status = 'canceled'
      and p_event_type = 'checkout.session.completed'
      and p_subscription_status = 'active'
      and v_company.stripe_customer_id = p_stripe_customer_id
    )
  then
    raise exception 'tenant is already bound to another Stripe subscription' using errcode = '23505';
  end if;

  insert into public.app_stripe_webhook_events(
    event_id, event_type, company_id, stripe_customer_id, event_created_at, result
  ) values (
    p_event_id, p_event_type, v_company.id, p_stripe_customer_id, p_event_created_at, v_result
  )
  on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return 'duplicate'; end if;

  if v_result = 'stale' then return v_result; end if;

  update public.app_companies
  set subscription_status = p_subscription_status,
      stripe_customer_id = p_stripe_customer_id,
      stripe_subscription_id = p_stripe_subscription_id,
      current_period_end = p_current_period_end,
      stripe_event_created_at = p_event_created_at
  where id = v_company.id;

  return v_result;
end;
$$;

revoke all on function public.app_apply_stripe_subscription_event(
  text, text, timestamptz, uuid, text, text, text, timestamptz
) from public, anon, authenticated;
grant execute on function public.app_apply_stripe_subscription_event(
  text, text, timestamptz, uuid, text, text, text, timestamptz
) to service_role;
