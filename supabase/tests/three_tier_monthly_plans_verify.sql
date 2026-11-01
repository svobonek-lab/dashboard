-- Disposable PostgreSQL verification for the monthly billing plan migration.
-- No real users, customer rows, Stripe calls, or live database writes.
begin;
insert into auth.users(id, email, email_confirmed_at) values
  ('60000000-0000-4000-8000-000000000006', 'owner-start@example.invalid', clock_timestamp()),
  ('70000000-0000-4000-8000-000000000007', 'owner-growth@example.invalid', clock_timestamp()),
  ('80000000-0000-4000-8000-000000000008', 'owner-pro@example.invalid', clock_timestamp());

set role service_role;
do $$
declare
  v_start jsonb;
  v_growth jsonb;
  v_pro jsonb;
  v_retry jsonb;
  v_assigned_plan text;
  v_stamp timestamptz := clock_timestamp();
begin
  if to_regprocedure('public.app_prepare_paid_registration(uuid,uuid,text,text,text,timestamptz)') is not null then
    raise exception 'old paid registration RPC signature remains callable';
  end if;
  if has_function_privilege('authenticated', 'public.app_prepare_paid_registration(uuid,uuid,text,text,text,timestamptz,text)', 'execute')
    or not has_function_privilege('service_role', 'public.app_prepare_paid_registration(uuid,uuid,text,text,text,timestamptz,text)', 'execute') then
    raise exception 'paid registration RPC grants are not service-role-only';
  end if;

  begin
    perform public.app_prepare_paid_registration(
      '60000000-0000-4000-8000-000000000006', '61000000-0000-4000-8000-000000000006',
      'Pilot firm', 'pilot-firm', 'Owner Start', v_stamp, 'pilot'
    );
    raise exception 'new Founding Pilot subscription was allowed';
  exception when invalid_parameter_value then
    null;
  end;

  v_start := public.app_prepare_paid_registration(
    '60000000-0000-4000-8000-000000000006', '61000000-0000-4000-8000-000000000006',
    'Start firm', 'start-firm', 'Owner Start', v_stamp, 'starter'
  );
  v_growth := public.app_prepare_paid_registration(
    '70000000-0000-4000-8000-000000000007', '71000000-0000-4000-8000-000000000007',
    'Growth firm', 'growth-firm', 'Owner Growth', v_stamp, 'growth'
  );
  v_pro := public.app_prepare_paid_registration(
    '80000000-0000-4000-8000-000000000008', '81000000-0000-4000-8000-000000000008',
    'Pro firm', 'pro-firm', 'Owner Pro', v_stamp, 'pro'
  );
  v_retry := public.app_prepare_paid_registration(
    '60000000-0000-4000-8000-000000000006', '61000000-0000-4000-8000-000000000006',
    'Start firm', 'start-firm', 'Owner Start', v_stamp, 'starter'
  );
  if v_start->>'plan' <> 'starter' or v_growth->>'plan' <> 'growth' or v_pro->>'plan' <> 'pro' then
    raise exception 'registration intent did not preserve the chosen monthly plan';
  end if;
  if v_retry->>'id' is distinct from v_start->>'id' then
    raise exception 'same-plan retry created a different intent';
  end if;

  select plan into v_assigned_plan from public.app_platform_set_billing_plan(
    '30000000-0000-4000-8000-000000000003',
    '10000000-0000-4000-8000-000000000001',
    'pro'
  );
  if v_assigned_plan <> 'pro' then
    raise exception 'platform administrator could not assign Profi';
  end if;
end;
$$;
reset role;
rollback;
