begin;
insert into public.app_companies(id,name,slug,active,public_form) values
('ad190001-0000-4000-8000-000000000001','Synthetic public','synthetic-public-ad190001',true,true);
create temp table intake_results(id uuid);
grant all on intake_results to anon;
set local role anon;
insert into intake_results select public.app_submit_public_lead('synthetic-public-ad190001','request-one','Customer','123','c@example.invalid','Title','Description',100);
insert into intake_results select public.app_submit_public_lead('synthetic-public-ad190001','request-one','Changed','999','','Other','Other',999);
do $$ begin
  begin
    perform public.app_submit_public_lead('missing-slug','x','x','','','x','',0);
    raise exception 'FAIL: unknown tenant accepted';
  exception when raise_exception then if sqlerrm='FAIL: unknown tenant accepted' then raise; end if; end;
end $$;
reset role;
do $$ declare first_id uuid; retry_id uuid;
begin
  select id into first_id from intake_results limit 1;
  select id into retry_id from intake_results offset 1 limit 1;
  if first_id is null or first_id is distinct from retry_id then raise exception 'FAIL: retry created another lead'; end if;
  if (select count(*) from public.app_leads where company_id='ad190001-0000-4000-8000-000000000001')<>1 then raise exception 'FAIL: expected one lead'; end if;
  if (select lead_id from public.app_public_intake_events where company_id='ad190001-0000-4000-8000-000000000001') is distinct from first_id then raise exception 'FAIL: event lacks lead id'; end if;
end $$;
select 'PASS: public slug, idempotency, event provenance' result;
rollback;
