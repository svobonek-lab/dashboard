begin;
insert into public.app_companies(id,name,slug) values('ad180001-0000-4000-8000-000000000001','Synthetic resend','audit-resend-ad180001');
insert into public.app_members(company_id,user_id,name,email,role,active) values
('ad180001-0000-4000-8000-000000000001','ad180002-0000-4000-8000-000000000001','Owner','owner@example.invalid','owner',true);
set local role authenticated;
select set_config('request.jwt.claim.sub','ad180002-0000-4000-8000-000000000001',true);
do $$ declare first_id uuid; second_id uuid;
begin
  first_id := public.app_create_invite('ad180001-0000-4000-8000-000000000001','worker@example.invalid','Worker');
  second_id := public.app_create_invite('ad180001-0000-4000-8000-000000000001','worker@example.invalid','Worker');
  if first_id=second_id then raise exception 'FAIL: resend reused id'; end if;
  if (select expires_at>now() from public.app_invites where id=first_id) then raise exception 'FAIL: previous invite remains active'; end if;
  if not (select expires_at>now() from public.app_invites where id=second_id) then raise exception 'FAIL: replacement invite inactive'; end if;
end $$;
reset role;
select 'PASS: resend expires previous unused invitation' result;
rollback;
