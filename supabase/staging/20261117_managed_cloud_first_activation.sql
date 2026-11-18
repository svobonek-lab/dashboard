-- STAGING-ONLY REVIEW PROPOSAL. Apply only after the admin-onboarding proposal.
-- Existing tenants keep the reviewed subscription renewal and rebind behavior.
begin;

alter table public.app_stripe_webhook_events
  add column if not exists reported_subscription_status text
  check (reported_subscription_status in ('active', 'past_due', 'canceled'));

do $$
declare
  definition text;
begin
  definition := pg_get_functiondef('public.app_apply_stripe_subscription_event(text,text,timestamptz,uuid,text,text,text,timestamptz)'::regprocedure);
  if position('v_company.subscription_status = ''canceled''' in definition) = 0
    or position('if v_result = ''stale'' then return v_result; end if;' in definition) = 0 then
    raise exception 'Stripe subscription RPC differs from reviewed rebind baseline';
  end if;
end;
$$;

create table if not exists public.app_first_checkout_activations (
  company_id uuid primary key references public.app_companies(id) on delete cascade,
  event_id text not null unique references public.app_stripe_webhook_events(event_id),
  checkout_session_id text not null unique check (length(checkout_session_id) between 5 and 255),
  stripe_customer_id text not null,
  stripe_subscription_id text not null,
  activated_at timestamptz not null default clock_timestamp()
);
alter table public.app_first_checkout_activations enable row level security;
revoke all on public.app_first_checkout_activations from public, anon, authenticated;

-- Patch the live rebind function only at an exact, verified statement boundary.
-- The event is still inserted as stale, but it never grants initial access.
do $patch$
declare
  target regprocedure := 'public.app_apply_stripe_subscription_event(text,text,timestamptz,uuid,text,text,text,timestamptz)'::regprocedure;
  definition text := pg_get_functiondef(target);
  marker text := '  insert into public.app_stripe_webhook_events(';
  columns_marker text := 'event_id, event_type, company_id, stripe_customer_id, event_created_at, result';
  values_marker text := 'p_event_id, p_event_type, v_company.id, p_stripe_customer_id, p_event_created_at, v_result';
begin
  if position(marker in definition) = 0
    or (length(definition) - length(replace(definition, marker, ''))) / length(marker) <> 1
    or (length(definition) - length(replace(definition, columns_marker, ''))) / length(columns_marker) <> 1
    or (length(definition) - length(replace(definition, values_marker, ''))) / length(values_marker) <> 1 then
    raise exception 'Stripe event insertion boundary differs from reviewed baseline';
  end if;
  definition := replace(definition, columns_marker, columns_marker || ', reported_subscription_status');
  definition := replace(definition, values_marker, values_marker || ', p_subscription_status');
  execute replace(definition, marker,
    '  if v_company.subscription_status = ''not_configured'' then v_result := ''stale''; end if;' || chr(10) || marker);
end;
$patch$;

create or replace function public.app_activate_paid_checkout(
  p_event_id text, p_event_created_at timestamptz, p_tenant_id uuid,
  p_stripe_customer_id text, p_stripe_subscription_id text,
  p_checkout_session_id text, p_payment_status text, p_plan text
)
returns text
language plpgsql security definer set search_path = ''
as $$
declare
  v_company public.app_companies%rowtype;
  v_inserted integer;
  v_result text;
begin
  if p_event_id is null or length(p_event_id) not between 5 and 255
    or p_event_created_at is null or p_tenant_id is null
    or p_stripe_customer_id is null or length(p_stripe_customer_id) not between 5 and 255
    or p_stripe_subscription_id is null or length(p_stripe_subscription_id) not between 5 and 255
    or p_checkout_session_id is null or length(p_checkout_session_id) not between 5 and 255
    or p_payment_status is null or p_plan not in ('starter', 'growth', 'pro') or p_plan is null then
    raise exception 'invalid paid Checkout event' using errcode = '22023';
  end if;
  if exists (select 1 from public.app_stripe_webhook_events where event_id = p_event_id) then
    return 'duplicate';
  end if;

  select * into v_company from public.app_companies where id = p_tenant_id for update;
  if v_company.id is null then
    raise exception 'Checkout tenant binding was not found' using errcode = 'P0002';
  end if;
  if v_company.stripe_customer_id is distinct from p_stripe_customer_id
    or exists (select 1 from public.app_companies c where c.id <> p_tenant_id and c.stripe_customer_id = p_stripe_customer_id)
    or (v_company.stripe_subscription_id is not null and v_company.stripe_subscription_id <> p_stripe_subscription_id
      and v_company.subscription_status <> 'canceled') then
    raise exception 'Checkout tenant/customer/subscription binding mismatch' using errcode = '23505';
  end if;

  if v_company.subscription_status <> 'not_configured' and p_payment_status = 'paid' then
    return public.app_apply_stripe_subscription_event(
      p_event_id, 'checkout.session.completed', p_event_created_at, p_tenant_id,
      p_stripe_customer_id, p_stripe_subscription_id, 'active', null);
  end if;

  v_result := 'stale';
  if v_company.subscription_status = 'not_configured'
    and p_payment_status = 'paid'
    and v_company.plan = p_plan
    and v_company.active
    and exists (select 1 from public.app_members m where m.company_id = p_tenant_id and m.role = 'owner' and m.active)
    and exists (select 1 from public.app_invites i where i.company_id = p_tenant_id and i.role = 'owner' and i.accepted_at is not null)
    and not exists (
      select 1 from public.app_stripe_webhook_events e
      where e.company_id = p_tenant_id and e.stripe_customer_id = p_stripe_customer_id
        and e.event_type in ('customer.subscription.updated', 'customer.subscription.deleted')
        and e.reported_subscription_status in ('past_due', 'canceled')
        and e.event_created_at >= p_event_created_at
    ) then
    v_result := 'applied';
  end if;

  insert into public.app_stripe_webhook_events(event_id, event_type, company_id, stripe_customer_id, event_created_at, result)
  values(p_event_id, 'checkout.session.completed', p_tenant_id, p_stripe_customer_id, p_event_created_at, v_result)
  on conflict (event_id) do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then return 'duplicate'; end if;
  if v_result = 'stale' then return v_result; end if;

  insert into public.app_first_checkout_activations(
    company_id, event_id, checkout_session_id, stripe_customer_id, stripe_subscription_id)
  values(p_tenant_id, p_event_id, p_checkout_session_id, p_stripe_customer_id, p_stripe_subscription_id);
  update public.app_companies set
    subscription_status = 'active', stripe_subscription_id = p_stripe_subscription_id,
    stripe_event_created_at = p_event_created_at
  where id = p_tenant_id;
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, target_id, outcome, reason_code)
  values(null, 'company_subscription.activated', p_tenant_id, null, 'allowed', 'signed_paid_checkout');
  return 'applied';
end;
$$;

revoke all on function public.app_activate_paid_checkout(text,timestamptz,uuid,text,text,text,text,text)
  from public, anon, authenticated;
grant execute on function public.app_activate_paid_checkout(text,timestamptz,uuid,text,text,text,text,text)
  to service_role;

commit;
