-- Review proposal: enforce employee seats for every database write path.
-- Apply only after review to the isolated staging project; never to production
-- automatically.
begin;

create index if not exists app_members_active_employee_seats_idx
  on public.app_members(company_id)
  where role = 'employee' and active;

create index if not exists app_invites_pending_employee_seats_idx
  on public.app_invites(company_id, expires_at)
  where role = 'employee' and accepted_at is null and revoked_at is null;

create or replace function app_private.enforce_employee_seat_limit()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_company_id uuid;
  v_plan text;
  v_company_active boolean;
  v_limit bigint;
  v_active_employees bigint;
  v_pending_invites bigint;
  v_new_seat boolean;
begin
  if tg_table_name = 'app_invites' then
    v_new_seat := new.role = 'employee'
      and new.accepted_at is null
      and new.revoked_at is null
      and new.expires_at > clock_timestamp();
    if tg_op = 'UPDATE' and v_new_seat
      and old.role = 'employee' and old.accepted_at is null and old.revoked_at is null
      and old.expires_at > clock_timestamp() and old.company_id = new.company_id then
      -- Editing an already reserved invite in the same company does not add a seat.
      return new;
    end if;
  elsif tg_table_name = 'app_members' then
    v_new_seat := new.role = 'employee' and new.active;
    if tg_op = 'UPDATE' and v_new_seat
      and old.role = 'employee' and old.active and old.company_id = new.company_id
      and old.user_id = new.user_id then
      -- Editing an existing active employee in the same company does not add a seat.
      return new;
    end if;
  else
    raise exception 'employee seat trigger attached to unexpected table %', tg_table_name
      using errcode = '55000';
  end if;

  if not v_new_seat then return new; end if;

  v_company_id := new.company_id;
  select c.plan, c.active
    into v_plan, v_company_active
    from public.app_companies c
    where c.id = v_company_id
    for update;
  if not found or not v_company_active then
    raise exception 'company is not active' using errcode = '42501';
  end if;

  case lower(coalesce(v_plan, ''))
    when 'pilot' then v_limit := 5;
    when 'starter' then v_limit := 5;
    when 'growth' then v_limit := 15;
    when 'pro' then return new;
    else
      raise exception using
        message = 'SEAT_LIMIT_PLAN_UNSUPPORTED',
        errcode = 'P0001',
        detail = 'Pro tento tarif není definován limit zaměstnanců. Nastavte podporovaný tarif před přidáním zaměstnance.';
  end case;

  if tg_table_name = 'app_members' then
    if tg_op = 'INSERT' and exists (
      select 1 from public.app_members m
      where m.company_id = new.company_id and m.user_id = new.user_id
        and m.role = 'employee' and m.active
    ) then
      -- An INSERT ... ON CONFLICT that keeps an already active employee does
      -- not consume a second seat. Its UPDATE trigger still checks any change
      -- that would add a seat.
      return new;
    end if;

    if tg_op = 'UPDATE' then
      select count(*) into v_active_employees
        from public.app_members m
        where m.company_id = v_company_id and m.role = 'employee' and m.active
          and not (m.company_id = old.company_id and m.user_id = old.user_id);
    else
      select count(*) into v_active_employees
        from public.app_members m
        where m.company_id = v_company_id and m.role = 'employee' and m.active;
    end if;
    select count(*) into v_pending_invites
      from public.app_invites i
      where i.company_id = v_company_id and i.role = 'employee'
        and i.accepted_at is null and i.revoked_at is null and i.expires_at > clock_timestamp();
  else
    select count(*) into v_active_employees
      from public.app_members m
      where m.company_id = v_company_id and m.role = 'employee' and m.active;
    if tg_op = 'UPDATE' then
      select count(*) into v_pending_invites
        from public.app_invites i
        where i.company_id = v_company_id and i.role = 'employee'
          and i.accepted_at is null and i.revoked_at is null and i.expires_at > clock_timestamp()
          and i.id <> new.id;
    else
      select count(*) into v_pending_invites
        from public.app_invites i
        where i.company_id = v_company_id and i.role = 'employee'
          and i.accepted_at is null and i.revoked_at is null and i.expires_at > clock_timestamp();
    end if;
  end if;

  if v_active_employees + v_pending_invites + 1 > v_limit then
    raise exception using
      message = 'SEAT_LIMIT_REACHED',
      errcode = 'P0001',
      detail = format(
        'Firma dosáhla limitu %s zaměstnanců v tarifu %s. Zrušte nevyužitou pozvánku nebo změňte tarif.',
        v_limit, v_plan
      );
  end if;

  return new;
end;
$$;

revoke all on function app_private.enforce_employee_seat_limit() from public, anon, authenticated, service_role;

drop trigger if exists app_invites_employee_seat_limit on public.app_invites;
create trigger app_invites_employee_seat_limit
  before insert or update on public.app_invites
  for each row execute function app_private.enforce_employee_seat_limit();

drop trigger if exists app_members_employee_seat_limit on public.app_members;
create trigger app_members_employee_seat_limit
  before insert or update on public.app_members
  for each row execute function app_private.enforce_employee_seat_limit();

-- Preserve the complete staging acceptance contract. The invite row remains
-- locked while its reservation is marked accepted; the following member
-- trigger serializes the seat exchange on the company row. This order matches
-- invitation resend updates, which may already hold an invite row before the
-- trigger runs, and avoids an invite/company lock-order deadlock.
create or replace function app_private.accept_invite(p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.app_invites;
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
  v_password_was_set boolean;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select lower(u.email), u.email_confirmed_at,
    coalesce((u.raw_app_meta_data ->> 'invite_password_set')::boolean, false)
  into strict v_email, v_email_confirmed_at, v_password_was_set
  from auth.users u where u.id = v_user_id;
  if v_email_confirmed_at is null then raise exception 'verified email required' using errcode = '42501'; end if;
  if not v_password_was_set then raise exception 'password setup required' using errcode = '42501'; end if;

  select * into v_invite from public.app_invites i where i.id = p_invite_id for update;
  if not found or v_invite.accepted_at is not null or v_invite.revoked_at is not null
    or v_invite.expires_at <= clock_timestamp() or lower(v_invite.email) is distinct from v_email
    or v_invite.role not in ('owner', 'employee') then
    raise exception 'invitation is invalid, expired, used, or belongs to another account' using errcode = '42501';
  end if;
  if not exists (select 1 from public.app_companies c where c.id = v_invite.company_id and c.active) then
    raise exception 'company is not active' using errcode = '42501';
  end if;
  if v_invite.role = 'owner' and not exists (
    select 1 from public.app_company_legal_acceptances a
    where a.company_id = v_invite.company_id and a.invite_id = v_invite.id and a.actor_user_id = v_user_id
      and a.capture_source = 'owner_invite_activation' and a.agreement = 'terms_of_service'
  ) then raise exception 'owner legal consent required' using errcode = '42501'; end if;
  if v_invite.role = 'owner' and not exists (
    select 1 from public.app_company_legal_acceptances a
    where a.company_id = v_invite.company_id and a.invite_id = v_invite.id and a.actor_user_id = v_user_id
      and a.capture_source = 'owner_invite_activation' and a.agreement = 'data_processing_agreement'
  ) then raise exception 'owner data-processing agreement required' using errcode = '42501'; end if;
  if v_invite.role = 'owner' and exists (
    select 1 from public.app_members m where m.company_id = v_invite.company_id and m.role = 'owner' and m.active
  ) then raise exception 'company already has an active owner' using errcode = '42501'; end if;

  -- Release the pending reservation before adding the active membership. Both
  -- writes are in this function's transaction; an over-limit member trigger
  -- rolls back this update too, leaving the invitation pending.
  update public.app_invites
    set accepted_at = clock_timestamp(), accepted_by = v_user_id
    where id = v_invite.id and accepted_at is null and revoked_at is null
      and expires_at > clock_timestamp();
  if not found then
    raise exception 'invitation is invalid, expired, used, or belongs to another account' using errcode = '42501';
  end if;

  insert into public.app_members(company_id, user_id, name, email, role, active)
  values(v_invite.company_id, v_user_id, v_invite.name, v_email, v_invite.role, true)
  on conflict(company_id, user_id) do update
    set name = excluded.name, email = excluded.email, role = excluded.role, active = true;
  insert into public.app_platform_audit_events(actor_user_id, action, company_id, target_id, outcome, reason_code)
  values(v_user_id, 'company_invite.accepted', v_invite.company_id, v_invite.id, 'allowed', 'verified_invitation_with_password_and_legal_consent');
  return jsonb_build_object('companyId', v_invite.company_id, 'userId', v_user_id, 'role', v_invite.role);
end;
$$;

revoke all on function app_private.accept_invite(uuid) from public, anon, authenticated;
grant execute on function app_private.accept_invite(uuid) to authenticated;

commit;
