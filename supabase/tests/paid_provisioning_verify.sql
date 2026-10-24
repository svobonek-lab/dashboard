-- The setup intentionally omits the legal table (observed staging prerequisite gap).
do $$ begin
 if not (select relrowsecurity from pg_class where oid='public.app_company_legal_acceptances'::regclass) then raise exception 'legal evidence RLS missing'; end if;
 if has_table_privilege('authenticated','public.app_company_legal_acceptances','select') or has_table_privilege('anon','public.app_company_legal_acceptances','insert') then raise exception 'browser legal evidence access'; end if;
 if has_table_privilege('service_role','public.app_company_legal_acceptances','update') or has_table_privilege('service_role','public.app_company_legal_acceptances','delete') then raise exception 'mutable legal evidence'; end if;
end $$;
begin;
insert into public.app_paid_registration_intents(company_id,owner_user_id,owner_email,owner_name,company_name,slug,plan,stripe_customer_id,checkout_session_id,client_accepted_at)
values
('a0000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000004','owner-a@example.invalid','Owner A','New A','new-a','pilot','cus_newa','cs_newa',clock_timestamp()),
('b0000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000005','owner-b@example.invalid','Owner B','New B','new-b','pilot','cus_newb','cs_newb',clock_timestamp());

do $$
begin
 begin
 perform public.app_provision_paid_checkout('evt_bad',now(),'a0000000-0000-4000-8000-000000000001','cus_foreign','sub_newa','cs_newa','paid');
 raise exception 'foreign customer allowed';
 exception when insufficient_privilege then null; end;
 begin
 perform public.app_provision_paid_checkout('evt_unpaid',now(),'a0000000-0000-4000-8000-000000000001','cus_newa','sub_newa','cs_newa','unpaid');
 raise exception 'unpaid provisioning allowed';
 exception when invalid_parameter_value then null; end;
 if exists(select 1 from public.app_companies where slug='new-a') then raise exception 'failed checkout left company'; end if;
end $$;

select public.app_provision_paid_checkout('evt_paid_a',now(),'a0000000-0000-4000-8000-000000000001','cus_newa','sub_newa','cs_newa','paid');
do $$
declare r text;
begin
 if not exists(select 1 from public.app_companies where slug='new-a' and subscription_status='active') then raise exception 'active company missing'; end if;
 if (select count(*) from public.app_members where company_id='a0000000-0000-4000-8000-000000000001' and role='owner')<>1 then raise exception 'owner missing'; end if;
 if not exists(select 1 from public.app_workspace_defaults where company_id='a0000000-0000-4000-8000-000000000001') then raise exception 'defaults missing'; end if;
 if (select count(*) from public.app_company_legal_acceptances where company_id='a0000000-0000-4000-8000-000000000001')<>2 then raise exception 'legal audit missing'; end if;
 r:=public.app_provision_paid_checkout('evt_paid_a',now(),'a0000000-0000-4000-8000-000000000001','cus_newa','sub_newa','cs_newa','paid');
 if r<>'duplicate' then raise exception 'replayed checkout not idempotent'; end if;
end $$;
-- Inject a later-stage failure to prove earlier company/member writes roll back.
create function public.test_fail_defaults() returns trigger language plpgsql as $$
begin raise exception 'synthetic defaults failure' using errcode='23514'; end $$;
create trigger fail_defaults before insert on public.app_workspace_defaults for each row execute function public.test_fail_defaults();
do $$
begin
 begin
 perform public.app_provision_paid_checkout('evt_paid_b',now(),'b0000000-0000-4000-8000-000000000002','cus_newb','sub_newb','cs_newb','paid');
 raise exception 'failure injection did not fire';
 exception when check_violation then null; end;
 if exists(select 1 from public.app_companies where slug='new-b') or exists(select 1 from public.app_members where user_id='50000000-0000-4000-8000-000000000005') then
 raise exception 'partial workspace survived rollback'; end if;
 if exists(select 1 from public.app_paid_registration_intents where slug='new-b' and provisioned_at is not null) then raise exception 'intent consumed on failure'; end if;
 if has_function_privilege('authenticated','public.app_provision_paid_checkout(text,timestamptz,uuid,text,text,text,text)','execute') then raise exception 'browser provisioning privilege'; end if;
end $$;
rollback;

begin;
insert into auth.users values('60000000-0000-4000-8000-000000000006','new-owner@example.invalid',clock_timestamp());
do $$
declare v jsonb; v_retry jsonb; stamp timestamptz:=clock_timestamp();
begin
 v:=public.app_prepare_paid_registration('60000000-0000-4000-8000-000000000006','70000000-0000-4000-8000-000000000007','New C','new-c','Owner C',stamp);
 v_retry:=public.app_prepare_paid_registration('60000000-0000-4000-8000-000000000006','70000000-0000-4000-8000-000000000007','New C','new-c','Owner C',stamp);
 if v->>'id' is distinct from v_retry->>'id' then raise exception 'registration retry created new intent'; end if;
 if v->>'owner_email'<>'new-owner@example.invalid' or v->>'plan'<>'pilot' then raise exception 'server identity or plan mismatch'; end if;
 perform public.app_bind_registration_checkout((v->>'id')::uuid,'cus_newc','cs_newc');
 perform public.app_bind_registration_checkout((v->>'id')::uuid,'cus_newc','cs_newc');
 begin
  perform public.app_bind_registration_checkout((v->>'id')::uuid,'cus_foreign','cs_foreign');
  raise exception 'intent rebound';
 exception when unique_violation then null; end;
 if exists(select 1 from public.app_companies where slug='new-c') then raise exception 'workspace created before paid webhook'; end if;
 if public.app_provision_paid_checkout('evt_paid_c',now(),(v->>'company_id')::uuid,'cus_newc','sub_newc','cs_newc','paid')<>'applied' then raise exception 'full registration provisioning failed'; end if;
 if not exists(select 1 from public.app_members where company_id=(v->>'company_id')::uuid and user_id='60000000-0000-4000-8000-000000000006' and role='owner') then raise exception 'full registration owner missing'; end if;
end $$;
rollback;
