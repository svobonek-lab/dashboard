begin;

do $preflight$
begin
  if to_regclass('public.app_companies') is null
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'app_companies' and column_name = 'active'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'app_companies' and column_name = 'subscription_status'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'app_companies' and column_name = 'stripe_customer_id'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'app_companies' and column_name = 'stripe_subscription_id'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'app_companies' and column_name = 'stripe_event_created_at'
     )
     or not exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'app_companies' and column_name = 'current_period_end'
     ) then
    raise exception 'Setup payment contract requires the active and reviewed Stripe billing columns on app_companies';
  end if;
end
$preflight$;

create table if not exists public.app_stripe_setup_payment_events (
  event_id text primary key check (event_id ~ '^evt_[A-Za-z0-9]+$'),
  checkout_session_id text not null unique check (checkout_session_id ~ '^cs_[A-Za-z0-9_]+$'),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  stripe_customer_id text not null check (stripe_customer_id ~ '^cus_[A-Za-z0-9]+$'),
  event_created_at timestamptz not null,
  amount_total integer not null check (amount_total = 490000),
  currency text not null check (currency = 'czk'),
  offer_version text not null check (offer_version = 'setup-fee-4900-czk-v1'),
  result text not null check (result in ('applied', 'stale')),
  processed_at timestamptz not null default clock_timestamp()
);

alter table public.app_stripe_setup_payment_events enable row level security;
revoke all on table public.app_stripe_setup_payment_events from public, anon, authenticated, service_role;

create or replace function public.app_apply_stripe_setup_payment_event(
  p_event_id text,
  p_event_created_at timestamptz,
  p_tenant_id uuid,
  p_stripe_customer_id text,
  p_checkout_session_id text,
  p_payment_status text,
  p_amount_total integer,
  p_currency text,
  p_offer_version text
)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company public.app_companies%rowtype;
  v_existing public.app_stripe_setup_payment_events%rowtype;
  v_other_company_id uuid;
  v_result text := 'applied';
  v_inserted integer;
begin
  if p_event_id is null or p_event_id !~ '^evt_[A-Za-z0-9]+$'
    or p_event_created_at is null
    or p_tenant_id is null
    or p_stripe_customer_id is null or p_stripe_customer_id !~ '^cus_[A-Za-z0-9]+$'
    or p_checkout_session_id is null or p_checkout_session_id !~ '^cs_[A-Za-z0-9_]+$'
    or p_payment_status is distinct from 'paid'
    or p_amount_total is distinct from 490000
    or p_currency is distinct from 'czk'
    or p_offer_version is distinct from 'setup-fee-4900-czk-v1'
  then
    raise exception 'invalid StavbaFlow setup payment' using errcode = '22023';
  end if;

  select * into v_existing
  from public.app_stripe_setup_payment_events e
  where e.event_id = p_event_id or e.checkout_session_id = p_checkout_session_id;
  if found then
    if v_existing.event_id = p_event_id
      and v_existing.checkout_session_id = p_checkout_session_id
      and v_existing.company_id = p_tenant_id
      and v_existing.stripe_customer_id = p_stripe_customer_id
      and v_existing.event_created_at = p_event_created_at
      and v_existing.amount_total = p_amount_total
      and v_existing.currency = p_currency
      and v_existing.offer_version = p_offer_version then
      return 'duplicate';
    end if;
    raise exception 'Stripe event or Checkout session binding conflict' using errcode = '23505';
  end if;

  select * into v_company
  from public.app_companies c
  where c.id = p_tenant_id
  for update;
  if not found or v_company.active is distinct from true then
    raise exception 'active workspace not found' using errcode = 'P0002';
  end if;

  -- A duplicate delivery can wait on the workspace lock while the first
  -- delivery commits. Recheck the idempotency record before checking state.
  select * into v_existing
  from public.app_stripe_setup_payment_events e
  where e.event_id = p_event_id or e.checkout_session_id = p_checkout_session_id;
  if found then
    if v_existing.event_id = p_event_id
      and v_existing.checkout_session_id = p_checkout_session_id
      and v_existing.company_id = p_tenant_id
      and v_existing.stripe_customer_id = p_stripe_customer_id
      and v_existing.event_created_at = p_event_created_at
      and v_existing.amount_total = p_amount_total
      and v_existing.currency = p_currency
      and v_existing.offer_version = p_offer_version then
      return 'duplicate';
    end if;
    raise exception 'Stripe event or Checkout session binding conflict' using errcode = '23505';
  end if;

  if v_company.subscription_status is distinct from 'not_configured'
    or v_company.stripe_subscription_id is not null then
    raise exception 'one-time setup activation is only available to an unconfigured workspace' using errcode = '23514';
  end if;

  select c.id into v_other_company_id
  from public.app_companies c
  where c.stripe_customer_id = p_stripe_customer_id and c.id <> p_tenant_id;
  if v_other_company_id is not null then
    raise exception 'Stripe customer already belongs to another workspace' using errcode = '23505';
  end if;
  if v_company.stripe_customer_id is not null and v_company.stripe_customer_id <> p_stripe_customer_id then
    raise exception 'workspace is bound to another Stripe customer' using errcode = '23505';
  end if;

  if v_company.stripe_event_created_at is not null and p_event_created_at < v_company.stripe_event_created_at then
    v_result := 'stale';
  end if;

  insert into public.app_stripe_setup_payment_events(
    event_id, checkout_session_id, company_id, stripe_customer_id, event_created_at,
    amount_total, currency, offer_version, result
  ) values (
    p_event_id, p_checkout_session_id, p_tenant_id, p_stripe_customer_id, p_event_created_at,
    p_amount_total, p_currency, p_offer_version, v_result
  ) on conflict do nothing;
  get diagnostics v_inserted = row_count;
  if v_inserted = 0 then
    select * into v_existing
    from public.app_stripe_setup_payment_events e
    where e.event_id = p_event_id or e.checkout_session_id = p_checkout_session_id;
    if v_existing.event_id = p_event_id
      and v_existing.checkout_session_id = p_checkout_session_id
      and v_existing.company_id = p_tenant_id
      and v_existing.stripe_customer_id = p_stripe_customer_id then
      return 'duplicate';
    end if;
    raise exception 'Stripe event or Checkout session binding conflict' using errcode = '23505';
  end if;

  if v_result = 'stale' then return v_result; end if;

  update public.app_companies
  set subscription_status = 'active',
      stripe_customer_id = p_stripe_customer_id,
      current_period_end = null,
      stripe_event_created_at = p_event_created_at
  where id = p_tenant_id and subscription_status = 'not_configured';

  if not found then
    raise exception 'workspace activation state changed' using errcode = '40001';
  end if;
  return 'applied';
end;
$$;

revoke all on function public.app_apply_stripe_setup_payment_event(text, timestamptz, uuid, text, text, text, integer, text, text)
  from public, anon, authenticated, service_role;
grant execute on function public.app_apply_stripe_setup_payment_event(text, timestamptz, uuid, text, text, text, integer, text, text)
  to service_role;

commit;
