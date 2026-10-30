begin;
insert into public.app_companies(id,name,slug) values('ad170001-0000-4000-8000-000000000001','Synthetic rollback','audit-rollback-ad170001');
select public.app_import_leads('ad170001-0000-4000-8000-000000000001','ad170001-0000-4000-8000-000000000002','[{"title":"Synthetic import","customer":"Synthetic","source_record_id":"1"}]'::jsonb,'synthetic.csv','synthetic-fingerprint');
update public.app_leads set title='Work done after import' where company_id='ad170001-0000-4000-8000-000000000001';
do $$
declare n integer;
begin
  begin
    perform public.app_rollback_import('ad170001-0000-4000-8000-000000000001','synthetic-fingerprint');
    raise exception 'FAIL: edited import was deleted';
  exception when raise_exception then
    if sqlerrm <> 'import has changed rows; rollback refused' then raise; end if;
  end;
  select count(*) into n from public.app_leads where company_id='ad170001-0000-4000-8000-000000000001' and title='Work done after import';
  if n<>1 then raise exception 'FAIL: edited lead lost'; end if;
  select count(*) into n from public.app_lead_events where company_id='ad170001-0000-4000-8000-000000000001';
  if n<>2 then raise exception 'FAIL: insert and edit history missing'; end if;
end $$;
select 'PASS: rollback preserves edited leads; history persisted inside transaction' as result;
rollback;
