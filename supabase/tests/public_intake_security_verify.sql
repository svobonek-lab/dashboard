\set ON_ERROR_STOP on

do $$
begin
  if exists (
    select 1 from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname = 'app_submit_public_lead'
      and pg_catalog.has_function_privilege('anon', p.oid, 'execute')
  ) then raise exception 'anon can bypass the public intake proxy'; end if;

  if not pg_catalog.has_function_privilege(
    'service_role',
    'public.app_submit_public_lead(text,text,text,text,text,text,text,numeric,text)',
    'execute'
  ) then raise exception 'service_role cannot execute the limited public intake RPC'; end if;

  if not exists (
    select 1 from pg_catalog.pg_attribute
    where attrelid = 'public.app_public_intake_events'::regclass
      and attname = 'client_ip_hash' and not attisdropped
  ) then raise exception 'client IP HMAC column is missing'; end if;
end;
$$;

set role service_role;
do $$
declare i integer; first_lead uuid; retry_lead uuid; sixth_blocked boolean := false;
  oversized_rejected boolean := false;
  oversized_email_rejected boolean := false;
  oversized_title_rejected boolean := false;
  oversized_description_rejected boolean := false;
  oversized_value_rejected boolean := false;
begin
  begin
    perform public.app_submit_public_lead(
      'firma-a', 'oversized-request', repeat('x', 121), '+420123456',
      '', 'Synthetic project', 'Synthetic description', 0, repeat('c', 64)
    );
  exception when sqlstate '22023' then
    oversized_rejected := true;
  end;
  if not oversized_rejected then raise exception 'oversized customer name was accepted by SQL'; end if;

  begin
    perform public.app_submit_public_lead(
      'firma-a', 'oversized-email', 'Synthetic Customer', '+420123456',
      repeat('e', 255), 'Synthetic project', 'Synthetic description', 0, repeat('c', 64)
    );
  exception when sqlstate '22023' then oversized_email_rejected := true;
  end;
  if not oversized_email_rejected then raise exception 'oversized email was accepted by SQL'; end if;

  begin
    perform public.app_submit_public_lead(
      'firma-a', 'oversized-title', 'Synthetic Customer', '+420123456',
      '', repeat('t', 121), 'Synthetic description', 0, repeat('c', 64)
    );
  exception when sqlstate '22023' then oversized_title_rejected := true;
  end;
  if not oversized_title_rejected then raise exception 'oversized title was accepted by SQL'; end if;

  begin
    perform public.app_submit_public_lead(
      'firma-a', 'oversized-description', 'Synthetic Customer', '+420123456',
      '', 'Synthetic project', repeat('d', 4001), 0, repeat('c', 64)
    );
  exception when sqlstate '22023' then oversized_description_rejected := true;
  end;
  if not oversized_description_rejected then raise exception 'oversized description was accepted by SQL'; end if;

  begin
    perform public.app_submit_public_lead(
      'firma-a', 'oversized-value', 'Synthetic Customer', '+420123456',
      '', 'Synthetic project', 'Synthetic description', 1000000001, repeat('c', 64)
    );
  exception when sqlstate '22023' then oversized_value_rejected := true;
  end;
  if not oversized_value_rejected then raise exception 'out-of-range value was accepted by SQL'; end if;

  for i in 1..5 loop
    first_lead := public.app_submit_public_lead(
      'firma-a', 'rate-request-' || i, 'Synthetic Customer', '+420123456',
      'customer@example.invalid', 'Synthetic project', 'Synthetic description', 0,
      repeat('a', 64)
    );
  end loop;

  retry_lead := public.app_submit_public_lead(
    'firma-a', 'rate-request-5', 'Changed Customer', '+420999999',
    '', 'Changed title', 'Changed description', 500,
    repeat('a', 64)
  );
  if retry_lead is distinct from first_lead then
    -- first_lead is the fifth newly created lead because the loop assigns it each time.
    raise exception 'idempotent retry returned a different lead';
  end if;

  begin
    perform public.app_submit_public_lead(
      'firma-a', 'rate-request-6', 'Synthetic Customer', '+420123456',
      '', 'Synthetic project', 'Synthetic description', 0,
      repeat('a', 64)
    );
  exception when sqlstate '54000' then
    sixth_blocked := true;
  end;
  if not sixth_blocked then raise exception 'sixth unique request was not rate limited'; end if;

  if public.app_submit_public_lead(
    'firma-a', 'different-ip-request', 'Synthetic Customer', '+420123456',
    '', 'Synthetic project', 'Synthetic description', 0,
    repeat('b', 64)
  ) is null then raise exception 'a different IP hash should have its own limit'; end if;
end;
$$;
reset role;

do $$
begin
  if (select count(*) from public.app_public_intake_events where company_id = '10000000-0000-4000-8000-000000000001' and client_ip_hash = repeat('a', 64)) <> 5 then
    raise exception 'expected five unique hashed-IP events';
  end if;
  if (select count(*) from public.app_leads where company_id = '10000000-0000-4000-8000-000000000001' and source = 'public_form') <> 6 then
    raise exception 'expected five limited leads and one lead under another IP';
  end if;
  if (select count(*) from public.app_public_intake_events
      where company_id = '10000000-0000-4000-8000-000000000001' and request_key = 'rate-request-5') <> 1
     or (select count(*) from public.app_leads
      where company_id = '10000000-0000-4000-8000-000000000001' and id = (
        select lead_id from public.app_public_intake_events
        where company_id = '10000000-0000-4000-8000-000000000001' and request_key = 'rate-request-5'
      )) <> 1 then
    raise exception 'idempotent retry must create exactly one lead';
  end if;
  if exists (
    select 1 from pg_catalog.pg_attribute
    where attrelid = 'public.app_public_intake_events'::regclass
      and attname in ('ip_address', 'raw_ip', 'client_ip') and not attisdropped
  ) then raise exception 'raw client IP column must not be stored'; end if;
end;
$$;

select 'PASS: server-only RPC, five-per-ten-minute limit, oversized fields, HMAC-only identity, exactly-once idempotency' as result;
