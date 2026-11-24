\set ON_ERROR_STOP on

update public.app_companies
set subscription_status = 'not_configured', stripe_customer_id = null,
    stripe_subscription_id = null, current_period_end = '2026-11-30T00:00:00Z',
    stripe_event_created_at = null
where id = '10000000-0000-4000-8000-000000000001';

update public.app_companies
set subscription_status = 'not_configured', stripe_subscription_id = null,
    stripe_event_created_at = '2026-11-25T00:00:00Z'
where id = '20000000-0000-4000-8000-000000000002';

insert into public.app_companies(id, name, plan, active, subscription_status)
values ('30000000-0000-4000-8000-000000000004', 'Synthetic concurrency tenant', 'pilot', true, 'not_configured');

do $$
declare
  v_result text;
begin
  if has_table_privilege('anon', 'public.app_stripe_setup_payment_events', 'select')
    or has_table_privilege('authenticated', 'public.app_stripe_setup_payment_events', 'select')
    or has_table_privilege('service_role', 'public.app_stripe_setup_payment_events', 'select') then
    raise exception 'setup payment event table exposes direct read grants';
  end if;
  if has_function_privilege('anon', 'public.app_apply_stripe_setup_payment_event(text,timestamptz,uuid,text,text,text,integer,text,text)', 'execute')
    or has_function_privilege('authenticated', 'public.app_apply_stripe_setup_payment_event(text,timestamptz,uuid,text,text,text,integer,text,text)', 'execute')
    or not has_function_privilege('service_role', 'public.app_apply_stripe_setup_payment_event(text,timestamptz,uuid,text,text,text,integer,text,text)', 'execute') then
    raise exception 'setup payment activation RPC grants are incorrect';
  end if;

  begin
    perform public.app_apply_stripe_setup_payment_event(
      'evt_setupwrongcustomer', '2026-11-24T11:59:59Z',
      '10000000-0000-4000-8000-000000000001', 'cus_boundb', 'cs_test_wrongcustomer',
      'paid', 490000, 'czk', 'setup-fee-4900-czk-v1'
    );
    raise exception 'customer bound to another company was accepted';
  exception when sqlstate '23505' then null;
  end;

  v_result := public.app_apply_stripe_setup_payment_event(
    'evt_setuppaid', '2026-11-24T12:00:00Z',
    '10000000-0000-4000-8000-000000000001', 'cus_setup1', 'cs_test_setup1',
    'paid', 490000, 'czk', 'setup-fee-4900-czk-v1'
  );
  if v_result <> 'applied' then raise exception 'expected applied, got %', v_result; end if;

  v_result := public.app_apply_stripe_setup_payment_event(
    'evt_setuppaid', '2026-11-24T12:00:00Z',
    '10000000-0000-4000-8000-000000000001', 'cus_setup1', 'cs_test_setup1',
    'paid', 490000, 'czk', 'setup-fee-4900-czk-v1'
  );
  if v_result <> 'duplicate' then raise exception 'expected duplicate, got %', v_result; end if;

  begin
    perform public.app_apply_stripe_setup_payment_event(
      'evt_setupother', '2026-11-24T12:00:01Z',
      '10000000-0000-4000-8000-000000000001', 'cus_setup1', 'cs_test_setup1',
      'paid', 490000, 'czk', 'setup-fee-4900-czk-v1'
    );
    raise exception 'reused Checkout session was accepted';
  exception when sqlstate '23505' then null;
  end;

  begin
    perform public.app_apply_stripe_setup_payment_event(
      'evt_setupbadamount', '2026-11-24T12:00:02Z',
      '10000000-0000-4000-8000-000000000001', 'cus_setup1', 'cs_test_badamount',
      'paid', 100, 'czk', 'setup-fee-4900-czk-v1'
    );
    raise exception 'incorrect payment amount was accepted';
  exception when sqlstate '22023' then null;
  end;

  v_result := public.app_apply_stripe_setup_payment_event(
    'evt_setupstale', '2026-11-24T12:00:04Z',
    '20000000-0000-4000-8000-000000000002', 'cus_boundb', 'cs_test_setupstale',
    'paid', 490000, 'czk', 'setup-fee-4900-czk-v1'
  );
  if v_result <> 'stale' then raise exception 'expected stale, got %', v_result; end if;

  update public.app_companies set active = false
  where id = '20000000-0000-4000-8000-000000000002';
  begin
    perform public.app_apply_stripe_setup_payment_event(
      'evt_setupinactive', '2026-11-26T12:00:00Z',
      '20000000-0000-4000-8000-000000000002', 'cus_boundb', 'cs_test_setupinactive',
      'paid', 490000, 'czk', 'setup-fee-4900-czk-v1'
    );
    raise exception 'suspended workspace was activated';
  exception when sqlstate 'P0002' then null;
  end;
end
$$;

do $$
begin
  if not exists (
    select 1 from public.app_companies
    where id = '10000000-0000-4000-8000-000000000001'
      and active is true
      and plan = 'pilot'
      and subscription_status = 'active'
      and stripe_customer_id = 'cus_setup1'
      and stripe_subscription_id is null
      and current_period_end is null
  ) then raise exception 'one-time activation changed the wrong workspace state'; end if;

  if not exists (
    select 1 from public.app_stripe_setup_payment_events
    where event_id = 'evt_setuppaid' and checkout_session_id = 'cs_test_setup1'
      and result = 'applied' and amount_total = 490000 and currency = 'czk'
  ) then raise exception 'paid setup event was not persisted'; end if;

  if not exists (
    select 1 from public.app_stripe_setup_payment_events
    where event_id = 'evt_setupstale' and result = 'stale'
  ) then raise exception 'stale setup event was not recorded'; end if;

  if exists (
    select 1 from public.app_companies
    where id = '20000000-0000-4000-8000-000000000002'
      and subscription_status = 'active'
  ) then raise exception 'stale or suspended company was activated'; end if;
end
$$;
