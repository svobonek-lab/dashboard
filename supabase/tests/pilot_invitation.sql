begin;
insert into auth.users(id,email,email_confirmed_at) values('ad170002-0000-4000-8000-000000000004','pilot-worker@example.invalid',now());
insert into public.app_companies(id,name,slug) values('ad170001-0000-4000-8000-000000000001','Synthetic invite','audit-invite-ad170001');
insert into public.app_invites(id,company_id,email,name,expires_at,role) values
('ad170004-0000-4000-8000-000000000001','ad170001-0000-4000-8000-000000000001','pilot-worker@example.invalid','Synthetic worker',now()+interval '1 day','employee'),
('ad170004-0000-4000-8000-000000000002','ad170001-0000-4000-8000-000000000001','pilot-worker@example.invalid','Expired',now()-interval '1 day','employee'),
('ad170004-0000-4000-8000-000000000003','ad170001-0000-4000-8000-000000000001','another@example.invalid','Wrong email',now()+interval '1 day','employee');
set local role authenticated;
select set_config('request.jwt.claim.sub','ad170002-0000-4000-8000-000000000004',true);
select set_config('request.jwt.claim.email','pilot-worker@example.invalid',true);
do $$
begin
  begin
    perform public.app_accept_invite('ad170004-0000-4000-8000-000000000002');
    raise exception 'FAIL: expired accepted';
  exception when insufficient_privilege then null; end;
  begin
    perform public.app_accept_invite('ad170004-0000-4000-8000-000000000003');
    raise exception 'FAIL: wrong email accepted';
  exception when insufficient_privilege then null; end;
  perform public.app_accept_invite('ad170004-0000-4000-8000-000000000001');
  if not exists(select 1 from public.app_members where user_id=auth.uid() and company_id='ad170001-0000-4000-8000-000000000001' and role='employee' and active) then raise exception 'FAIL: missing membership'; end if;
  begin
    perform public.app_accept_invite('ad170004-0000-4000-8000-000000000001');
    raise exception 'FAIL: reused invitation';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select 'PASS: verified email, expiry, one-time acceptance and membership' as result;
rollback;
