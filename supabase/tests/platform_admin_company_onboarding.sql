\set ON_ERROR_STOP on

insert into public.app_platform_admins(user_id, active)
values ('90000000-0000-4000-8000-000000000009', true)
on conflict (user_id) do update set active = true, revoked_at = null;

do $$
begin
  begin
    perform * from public.app_platform_create_company_onboarding(
      '91000000-0000-4000-8000-000000000019', 'Zakázaná firma', 'zakazana-firma',
      'Cizí uživatel', 'other-owner@example.invalid', 'pilot'
    );
    raise exception 'FAIL: non-admin created a company';
  exception when insufficient_privilege then null;
  end;
end $$;

insert into auth.users(id, email, email_confirmed_at)
values ('33000000-0000-4000-8000-000000000003', 'pilot-owner@example.invalid', clock_timestamp());

create temporary table owner_acceptance_result as
select * from public.app_platform_create_company_onboarding(
  '90000000-0000-4000-8000-000000000009', 'Pilotní firma', 'pilotni-firma',
  'Pilot Owner', 'pilot-owner@example.invalid', 'pilot'
);

select invite_id as owner_invite_id from owner_acceptance_result \gset
set role authenticated;
select set_config('request.jwt.claim.sub', '33000000-0000-4000-8000-000000000003', false);
select public.app_accept_invite(:'owner_invite_id'::uuid);
reset role;

do $$
declare v_company uuid := (select company_id from owner_acceptance_result);
begin
  if (select count(*) from public.app_members where company_id = v_company and role = 'owner' and active) <> 1
    then raise exception 'FAIL: accepted owner invite did not create owner membership'; end if;
  if (select count(*) from public.app_platform_audit_events where company_id = v_company and action = 'company_invite.accepted') <> 1
    then raise exception 'FAIL: owner acceptance audit missing'; end if;
end $$;

create temporary table onboarding_result as
select * from public.app_platform_create_company_onboarding(
  '90000000-0000-4000-8000-000000000009', 'Střechy Novák', 'strechy-novak',
  'Jan Novák', 'jan@example.invalid', 'pilot'
);

do $$
declare v_company uuid := (select company_id from onboarding_result);
begin
  if (select count(*) from public.app_companies where id = v_company and slug = 'strechy-novak' and plan = 'pilot') <> 1
    then raise exception 'FAIL: company missing'; end if;
  if (select count(*) from public.app_invites where company_id = v_company and role = 'owner' and accepted_at is null and revoked_at is null) <> 1
    then raise exception 'FAIL: expected exactly one owner invite'; end if;
  if (select count(*) from public.app_platform_audit_events where company_id = v_company and action = 'company_onboarding.created') <> 1
    then raise exception 'FAIL: onboarding audit missing'; end if;
  begin
    perform * from public.app_platform_create_company_onboarding(
      '90000000-0000-4000-8000-000000000009', 'Duplikát', 'strechy-novak',
      'Jiný vlastník', 'other@example.invalid', 'pilot'
    );
    raise exception 'FAIL: duplicate slug accepted';
  exception when unique_violation then null;
  end;
end $$;

select * from public.app_platform_resend_owner_invite(
  '90000000-0000-4000-8000-000000000009', (select company_id from onboarding_result)
);

do $$
declare v_company uuid := (select company_id from onboarding_result);
begin
  if (select count(*) from public.app_invites where company_id = v_company and role = 'owner' and accepted_at is null and revoked_at is null) <> 1
    then raise exception 'FAIL: resend created duplicate owner invites'; end if;
  perform * from public.app_platform_get_public_form_link(
    '90000000-0000-4000-8000-000000000009', v_company
  );
  if (select count(*) from public.app_platform_audit_events where company_id = v_company and action = 'company_public_form_link.requested') <> 1
    then raise exception 'FAIL: public form action audit missing'; end if;
end $$;

select public.app_platform_cancel_company_onboarding(
  '90000000-0000-4000-8000-000000000009',
  (select company_id from onboarding_result),
  (select id from public.app_invites where company_id = (select company_id from onboarding_result) and role = 'owner' and revoked_at is null)
);

do $$
begin
  if exists (select 1 from public.app_companies where slug = 'strechy-novak')
    then raise exception 'FAIL: compensation left orphan company'; end if;
  if exists (select 1 from public.app_invites where company_id = (select company_id from onboarding_result))
    then raise exception 'FAIL: compensation left orphan invite'; end if;
  if not exists (select 1 from public.app_platform_audit_events where action = 'company_onboarding.failed')
    then raise exception 'FAIL: compensation audit missing'; end if;
end $$;
