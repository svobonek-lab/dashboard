begin;
insert into auth.users values('60000000-0000-4000-8000-000000000006','combined@example.invalid',clock_timestamp());
do $$
declare intent jsonb; claims jsonb;
begin
 intent:=public.app_prepare_paid_registration('60000000-0000-4000-8000-000000000006','70000000-0000-4000-8000-000000000007','Combined','combined','Owner',clock_timestamp());
 perform public.app_bind_registration_checkout((intent->>'id')::uuid,'cus_combined','cs_combined');
 perform public.app_provision_paid_checkout('evt_combined',clock_timestamp(),(intent->>'company_id')::uuid,'cus_combined','sub_combined','cs_combined','paid');
 claims:=public.app_tenant_access_token_hook('{"user_id":"60000000-0000-4000-8000-000000000006","claims":{"role":"authenticated"}}');
 if claims#>>'{claims,app_metadata,tenant_id}' is distinct from intent->>'company_id' then raise exception 'paid owner did not receive correct tenant claim'; end if;
 perform set_config('test.company_id',intent->>'company_id',true);
 perform set_config('request.jwt.claims',(claims->'claims')::text,true);
 perform set_config('request.jwt.claim.sub','60000000-0000-4000-8000-000000000006',true);
end $$;
set role authenticated;
do $$
begin
 if (select count(*) from public.app_companies)<>1 then raise exception 'paid owner cannot access exactly own workspace'; end if;
 if (select count(*) from public.app_members)<>1 then raise exception 'paid owner membership access failed'; end if;
 if not exists(select 1 from public.app_companies where id=current_setting('test.company_id')::uuid and subscription_status='active') then raise exception 'paid access inactive'; end if;
 insert into public.app_leads(id,company_id,title) values(gen_random_uuid(),current_setting('test.company_id')::uuid,'first synthetic job');
 if (select count(*) from public.app_leads)<>1 then raise exception 'paid owner first job missing'; end if;
end $$;
select set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"20000000-0000-4000-8000-000000000002"}}',true);
do $$ begin
 if exists(select 1 from public.app_companies) or exists(select 1 from public.app_leads) then raise exception 'paid owner crossed company'; end if;
end $$;
reset role;
rollback;
