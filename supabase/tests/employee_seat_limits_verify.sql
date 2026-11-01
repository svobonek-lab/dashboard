-- Run after employee_seat_limits_setup.sql and the proposed migration in a
-- disposable PostgreSQL database. All fixture writes roll back at the end.
\set ON_ERROR_STOP on
begin;

create or replace function pg_temp.assert_invite_seat_limit(p_company_id uuid, p_email text)
returns void language plpgsql
as $$
declare v_id uuid; v_state text; v_message text; v_detail text;
begin
  begin
    v_id := public.app_create_invite(p_company_id, p_email, 'Over-limit fixture');
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_message = message_text, v_detail = pg_exception_detail;
    if v_message = 'SEAT_LIMIT_REACHED' and v_state = 'P0001'
      and coalesce(v_detail, '') ilike '%zaměstnanc%' then
      return;
    end if;
    raise exception 'Expected SEAT_LIMIT_REACHED with Czech detail; got state %, message %, detail %',
      v_state, v_message, coalesce(v_detail, '<none>');
  end;
  raise exception 'SEAT_LIMIT_NOT_ENFORCED: invite for % was created', p_email;
end
$$;

create or replace function pg_temp.assert_unsupported_plan(p_company_id uuid, p_email text)
returns void language plpgsql
as $$
declare v_id uuid; v_state text; v_message text;
begin
  begin
    v_id := public.app_create_invite(p_company_id, p_email, 'Unsupported-plan fixture');
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_message = message_text;
    if v_state = 'P0001' and v_message = 'SEAT_LIMIT_PLAN_UNSUPPORTED' then return; end if;
    raise exception 'Expected SEAT_LIMIT_PLAN_UNSUPPORTED; got state %, message %', v_state, v_message;
  end;
  raise exception 'SEAT_LIMIT_PLAN_NOT_ENFORCED: unsupported business plan was accepted';
end
$$;

insert into auth.users(id, email, email_confirmed_at, raw_app_meta_data) values
  ('50000000-0000-4000-8000-000000000002', 'direct-active-a@example.invalid', now(), '{"invite_password_set":true}'),
  ('50000000-0000-4000-8000-000000000003', 'direct-active-b@example.invalid', now(), '{"invite_password_set":true}');

do $$
declare
  v_invite_id uuid;
  v_active integer;
  v_pending integer;
  v_state text;
  v_message text;
  v_detail text;
  i integer;
begin
  -- Tenant A is at four active employees on Pilot. Its first pending invite
  -- fills exactly the fifth reserved seat.
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
  v_invite_id := public.app_create_invite(
    '11000000-0000-4000-8000-000000000001', 'pilot-accept@example.invalid', 'Pilot Accept'
  );
  select count(*) into v_active from public.app_members
  where company_id = '11000000-0000-4000-8000-000000000001' and role = 'employee' and active;
  select count(*) into v_pending from public.app_invites
  where company_id = '11000000-0000-4000-8000-000000000001' and role = 'employee'
    and accepted_at is null and revoked_at is null and expires_at > clock_timestamp();
  if v_active <> 4 or v_pending <> 1 then raise exception 'Pilot did not reserve its fifth employee seat'; end if;

  -- The company cap counts the pending reservation; a direct RPC cannot add
  -- a sixth seat. A direct active-membership write is guarded too.
  perform pg_temp.assert_invite_seat_limit(
    '11000000-0000-4000-8000-000000000001', 'over-limit-a@example.invalid'
  );
  begin
    insert into public.app_members(company_id, user_id, name, email, role, active)
    values ('11000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000002',
      'Direct Active A', 'direct-active-a@example.invalid', 'employee', true);
    raise exception 'SEAT_LIMIT_NOT_ENFORCED: direct membership write was allowed';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_message = message_text, v_detail = pg_exception_detail;
    if v_message = 'SEAT_LIMIT_NOT_ENFORCED: direct membership write was allowed' then raise; end if;
    if v_message <> 'SEAT_LIMIT_REACHED' or v_state <> 'P0001' or coalesce(v_detail, '') not ilike '%zaměstnanc%' then
      raise exception 'Expected direct-write seat limit with Czech detail; got state %, message %, detail %',
        v_state, v_message, coalesce(v_detail, '<none>');
    end if;
  end;

  -- Accepting a reserved invitation converts pending into active without
  -- consuming a second seat and retains the existing audit event.
  perform set_config('request.jwt.claim.sub', '50000000-0000-4000-8000-000000000001', true);
  perform public.app_accept_invite(v_invite_id);
  select count(*) into v_active from public.app_members
  where company_id = '11000000-0000-4000-8000-000000000001' and role = 'employee' and active;
  select count(*) into v_pending from public.app_invites
  where company_id = '11000000-0000-4000-8000-000000000001' and role = 'employee'
    and accepted_at is null and revoked_at is null and expires_at > clock_timestamp();
  if v_active <> 5 or v_pending <> 0 then raise exception 'Invitation acceptance did not exchange one reservation for one active seat'; end if;
  if not exists (select 1 from public.app_platform_audit_events where target_id = v_invite_id and action = 'company_invite.accepted') then
    raise exception 'Invitation acceptance audit event was not written';
  end if;
  update public.app_companies set plan = 'starter' where id = '11000000-0000-4000-8000-000000000001';
  perform set_config('request.jwt.claim.sub', '10000000-0000-4000-8000-000000000001', true);
  perform pg_temp.assert_invite_seat_limit(
    '11000000-0000-4000-8000-000000000001', 'starter-over-limit-a@example.invalid'
  );

  -- Tenant B reaches Growth's exact limit independently, despite Tenant A
  -- being full. Its second invitation is then rejected at 15.
  perform set_config('request.jwt.claim.sub', '20000000-0000-4000-8000-000000000001', true);
  v_invite_id := public.app_create_invite(
    '22000000-0000-4000-8000-000000000002', 'growth-last-seat@example.invalid', 'Growth Last Seat'
  );
  perform pg_temp.assert_invite_seat_limit(
    '22000000-0000-4000-8000-000000000002', 'growth-over-limit@example.invalid'
  );
  select count(*) into v_active from public.app_members
  where company_id = '22000000-0000-4000-8000-000000000002' and role = 'employee' and active;
  select count(*) into v_pending from public.app_invites
  where company_id = '22000000-0000-4000-8000-000000000002' and role = 'employee'
    and accepted_at is null and revoked_at is null and expires_at > clock_timestamp();
  if v_active <> 14 or v_pending <> 1 then raise exception 'Growth did not reserve exactly its fifteenth seat'; end if;

  -- Pro remains unlimited above both finite plan limits. Create 16 pending
  -- invites, then remove only those disposable rows before the downgrade case.
  perform set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000001', true);
  for i in 1..16 loop
    perform public.app_create_invite(
      '33000000-0000-4000-8000-000000000003',
      'pro-unlimited-' || i || '@example.invalid', 'Pro Unlimited ' || i
    );
  end loop;
  select count(*) into v_pending from public.app_invites
  where company_id = '33000000-0000-4000-8000-000000000003' and role = 'employee'
    and accepted_at is null and revoked_at is null and expires_at > clock_timestamp();
  if v_pending <> 16 then raise exception 'Pro did not allow more than fifteen reserved employee seats'; end if;
  delete from public.app_invites where company_id = '33000000-0000-4000-8000-000000000003';

  -- Simulate an over-cap plan downgrade. The failed activation must roll back
  -- both membership and invitation changes, preserving the reservation.
  for i in 3..7 loop
    insert into auth.users(id, email, email_confirmed_at, raw_app_meta_data)
    values (('30000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
      'pro-active-' || i || '@example.invalid', now(), '{"invite_password_set":true}');
    insert into public.app_members(company_id, user_id, name, email, role, active)
    values ('33000000-0000-4000-8000-000000000003',
      ('30000000-0000-4000-8000-' || lpad(i::text, 12, '0'))::uuid,
      'Pro Active ' || i, 'pro-active-' || i || '@example.invalid', 'employee', true);
  end loop;
  v_invite_id := public.app_create_invite(
    '33000000-0000-4000-8000-000000000003', 'pro-accept@example.invalid', 'Pro Accept'
  );
  update public.app_companies set plan = 'starter' where id = '33000000-0000-4000-8000-000000000003';
  perform set_config('request.jwt.claim.sub', '30000000-0000-4000-8000-000000000002', true);
  begin
    perform public.app_accept_invite(v_invite_id);
    raise exception 'SEAT_LIMIT_NOT_ENFORCED: over-cap invite activation was allowed';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate, v_message = message_text, v_detail = pg_exception_detail;
    if v_message = 'SEAT_LIMIT_NOT_ENFORCED: over-cap invite activation was allowed' then raise; end if;
    if v_message <> 'SEAT_LIMIT_REACHED' or v_state <> 'P0001' or coalesce(v_detail, '') not ilike '%zaměstnanc%' then
      raise exception 'Expected activation seat limit with Czech detail; got state %, message %, detail %',
        v_state, v_message, coalesce(v_detail, '<none>');
    end if;
  end;
  if exists (select 1 from public.app_members where company_id = '33000000-0000-4000-8000-000000000003'
      and user_id = '30000000-0000-4000-8000-000000000002' and active)
    or not exists (select 1 from public.app_invites where id = v_invite_id and accepted_at is null) then
    raise exception 'Over-cap activation did not roll back both membership and invite acceptance';
  end if;

  -- Legacy plans fail closed; they are never treated as unlimited.
  perform set_config('request.jwt.claim.sub', '40000000-0000-4000-8000-000000000001', true);
  perform pg_temp.assert_unsupported_plan(
    '44000000-0000-4000-8000-000000000004', 'business-plan-employee@example.invalid'
  );
end
$$;

rollback;
