-- Run only in isolated staging. All fixtures are rolled back.
begin;
insert into public.app_companies(id,name,slug) values
('ad170001-0000-4000-8000-000000000001','Synthetic A','audit-a-ad170001'),
('ad170001-0000-4000-8000-000000000002','Synthetic B','audit-b-ad170001');
insert into public.app_members(company_id,user_id,role) values
('ad170001-0000-4000-8000-000000000001','ad170002-0000-4000-8000-000000000001','owner'),
('ad170001-0000-4000-8000-000000000002','ad170002-0000-4000-8000-000000000002','owner'),
('ad170001-0000-4000-8000-000000000001','ad170002-0000-4000-8000-000000000003','employee');
insert into public.app_leads(id,company_id,title,assigned_to) values
('ad170003-0000-4000-8000-000000000001','ad170001-0000-4000-8000-000000000001','Assigned','ad170002-0000-4000-8000-000000000003'),
('ad170003-0000-4000-8000-000000000002','ad170001-0000-4000-8000-000000000001','Unassigned',null),
('ad170003-0000-4000-8000-000000000003','ad170001-0000-4000-8000-000000000002','Other company',null);
set local role authenticated;
select set_config('request.jwt.claim.sub','ad170002-0000-4000-8000-000000000099',true);
do $$
begin
  begin
    perform public.app_create_invite('ad170001-0000-4000-8000-000000000001','synthetic@example.invalid','Outsider');
    raise exception 'FAIL: outsider invitation was allowed';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub','ad170002-0000-4000-8000-000000000003',true);
do $$
declare n integer;
begin
  select count(*) into n from public.app_leads where company_id in ('ad170001-0000-4000-8000-000000000001','ad170001-0000-4000-8000-000000000002');
  if n <> 1 then raise exception 'FAIL: employee visibility'; end if;
  update public.app_leads set status='contacted' where id='ad170003-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: assigned status update'; end if;
  update public.app_leads set title='Forbidden' where id='ad170003-0000-4000-8000-000000000002';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: unassigned mutation'; end if;
  begin
    update public.app_leads set value=987654 where id='ad170003-0000-4000-8000-000000000001';
    raise exception 'FAIL: employee price mutation allowed';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.app_leads set status='won' where id='ad170003-0000-4000-8000-000000000001';
    raise exception 'FAIL: employee skipped workflow';
  exception when insufficient_privilege then null;
  end;
end $$;
select set_config('request.jwt.claim.sub','ad170002-0000-4000-8000-000000000001',true);
do $$
declare n integer;
begin
  select count(*) into n from public.app_leads where company_id='ad170001-0000-4000-8000-000000000002';
  if n <> 0 then raise exception 'FAIL: cross-company read'; end if;
  update public.app_leads set title='Forbidden' where id='ad170003-0000-4000-8000-000000000003';
  get diagnostics n = row_count;
  if n <> 0 then raise exception 'FAIL: cross-company update'; end if;
  update public.app_leads set value=100 where id='ad170003-0000-4000-8000-000000000001';
  get diagnostics n = row_count;
  if n <> 1 then raise exception 'FAIL: owner price update'; end if;
  perform public.app_create_invite('ad170001-0000-4000-8000-000000000001','synthetic@example.invalid','Owner invitation');
end $$;
reset role;
select 'PASS: invitations, employee fields, lifecycle, tenant isolation' as result;
rollback;
