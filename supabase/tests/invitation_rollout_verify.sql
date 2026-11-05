\set ON_ERROR_STOP on
-- Disposable fixture only. Never run against a hosted database.
insert into auth.users(id,email,invited_at,encrypted_password)
values ('33000000-0000-4000-8000-000000000003','rollout-owner@example.test',now(),'generated');
insert into public.app_platform_admins(user_id,active)
values ('90000000-0000-4000-8000-000000000009',true);
set role service_role;
select invite_id, company_id from public.app_platform_create_company_onboarding(
 '90000000-0000-4000-8000-000000000009','Rollout fixture','rollout-fixture',
 'Rollout owner','rollout-owner@example.test','pilot',now(),now()
) \gset
reset role;
select set_config('fixture.invite_id', :'invite_id', false);
select set_config('fixture.company_id', :'company_id', false);
set role service_role;
do $$ declare resent record; begin
  select * into resent from public.app_platform_resend_owner_invite(
    '90000000-0000-4000-8000-000000000009',current_setting('fixture.company_id')::uuid);
  if resent.invite_id <> current_setting('fixture.invite_id')::uuid then
    raise exception 'Resend duplicated the pending invitation';
  end if;
end $$;
reset role;
do $$ begin
  if not exists(select 1 from public.app_email_outbox
    where invite_id=current_setting('fixture.invite_id')::uuid
      and notification_kind='auth_invite' and status='pending' and html='') then
    raise exception 'Onboarding did not queue the invitation';
  end if;
end $$;
set request.jwt.claim.sub='33000000-0000-4000-8000-000000000003';
set role authenticated;
do $$ begin
  perform public.app_accept_invite(current_setting('fixture.invite_id')::uuid);
  raise exception 'Password gate was bypassed';
exception when insufficient_privilege then
  if sqlerrm <> 'password setup required' then raise; end if;
end $$;
reset role;
update auth.users set encrypted_password='updated'
where id='33000000-0000-4000-8000-000000000003';
set role authenticated;
do $$ begin
  perform public.app_accept_invite(current_setting('fixture.invite_id')::uuid);
  raise exception 'Consent gate was bypassed';
exception when insufficient_privilege then
  if sqlerrm <> 'owner legal consent required' then raise; end if;
end $$;
select public.app_record_owner_legal_consent(current_setting('fixture.invite_id')::uuid,now());
select public.app_accept_invite(current_setting('fixture.invite_id')::uuid);
do $$ begin
  perform public.app_accept_invite(current_setting('fixture.invite_id')::uuid);
  raise exception 'Accepted invitation was reused';
exception when insufficient_privilege then
  if sqlerrm <> 'invitation is invalid, expired, used, or belongs to another account' then raise; end if;
end $$;
reset role;
do $$ begin
  if not exists(select 1 from public.app_invites
    where id=current_setting('fixture.invite_id')::uuid
      and accepted_by='33000000-0000-4000-8000-000000000003') then
    raise exception 'Acceptance actor missing';
  end if;
  if (select count(*) from public.app_company_legal_acceptances
    where invite_id=current_setting('fixture.invite_id')::uuid) <> 4 then
    raise exception 'Expected two platform and two owner consent records';
  end if;
end $$;

insert into public.app_invites(id,company_id,email,name,role,expires_at,revoked_at)
values
 ('51000000-0000-4000-8000-000000000001',current_setting('fixture.company_id')::uuid,
  'rollout-owner@example.test','Expired','employee',now()-interval '1 day',null),
 ('51000000-0000-4000-8000-000000000002',current_setting('fixture.company_id')::uuid,
  'rollout-owner@example.test','Revoked','employee',now()+interval '1 day',now());
set role authenticated;
do $$ declare invitation uuid; begin
  foreach invitation in array array[
    '51000000-0000-4000-8000-000000000001'::uuid,
    '51000000-0000-4000-8000-000000000002'::uuid
  ] loop
    begin
      perform public.app_accept_invite(invitation);
      raise exception 'Expired or revoked invitation was accepted';
    exception when insufficient_privilege then
      if sqlerrm <> 'invitation is invalid, expired, used, or belongs to another account' then raise; end if;
    end;
  end loop;
end $$;
reset role;
