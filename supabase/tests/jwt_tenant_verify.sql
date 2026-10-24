-- Runs after jwt_tenant_setup.sql and proposed JWT boundary. Synthetic data only.
begin;
set role authenticated;
select set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
select set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',true);
do $$
declare n int;
begin
  select count(*) into n from public.app_leads;
  if n<>1 then raise exception 'owner A isolation failed'; end if;
  update public.app_leads set title='owned' where id='a1000000-0000-4000-8000-000000000001';
  get diagnostics n=row_count; if n<>1 then raise exception 'owner update failed'; end if;
  update public.app_leads set title='IDOR' where id='b1000000-0000-4000-8000-000000000002';
  get diagnostics n=row_count; if n<>0 then raise exception 'cross company update allowed'; end if;
  delete from public.app_leads where company_id='b0000000-0000-4000-8000-000000000002';
  get diagnostics n=row_count; if n<>0 then raise exception 'cross company delete allowed'; end if;
  begin
    insert into public.app_leads(id,company_id,title) values
    (gen_random_uuid(),'b0000000-0000-4000-8000-000000000002','IDOR');
    raise exception 'cross company insert allowed';
  exception when insufficient_privilege then null; end;
  begin
    update public.app_leads set company_id='b0000000-0000-4000-8000-000000000002'
      where id='a1000000-0000-4000-8000-000000000001';
    raise exception 'tenant move allowed';
  exception when insufficient_privilege then null; end;
end $$;
-- A forged claim for B must still fail live membership checks.
select set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"b0000000-0000-4000-8000-000000000002"}}',true);
do $$ begin if exists(select 1 from public.app_leads) then raise exception 'claim without membership allowed'; end if; end $$;
select set_config('request.jwt.claims','{"user_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',true);
do $$ begin if exists(select 1 from public.app_leads) then raise exception 'user_metadata trusted'; end if; end $$;
select set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"bad"}}',true);
do $$ begin if exists(select 1 from public.app_leads) then raise exception 'malformed claim allowed'; end if; end $$;
-- Employee can delete only their own assigned record, never a coworker's.
select set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003',true);
select set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',true);
insert into public.app_leads(id,company_id,title,assigned_to,created_by) values
('a2000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','own',
'30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001');
do $$
declare n int;
begin
 if (select created_by from public.app_leads where id='a2000000-0000-4000-8000-000000000001')<>auth.uid() then raise exception 'creator spoof allowed'; end if;
 delete from public.app_leads where id='a1000000-0000-4000-8000-000000000001';
 get diagnostics n=row_count; if n<>0 then raise exception 'coworker deletion allowed'; end if;
 delete from public.app_leads where id='a2000000-0000-4000-8000-000000000001';
 get diagnostics n=row_count; if n<>1 then raise exception 'own deletion blocked'; end if;
end $$;
reset role;
update public.app_members set active=false where user_id='30000000-0000-4000-8000-000000000003';
set role authenticated;
do $$ begin if exists(select 1 from public.app_leads) then raise exception 'revoked member retained access'; end if; end $$;
reset role;
do $$
declare e jsonb;
begin
 e:=public.app_tenant_access_token_hook('{"user_id":"10000000-0000-4000-8000-000000000001","claims":{"role":"authenticated"}}');
 if e#>>'{claims,app_metadata,tenant_id}'<>'a0000000-0000-4000-8000-000000000001' then raise exception 'hook missing owner claim'; end if;
 e:=public.app_tenant_access_token_hook('{"user_id":"30000000-0000-4000-8000-000000000003","claims":{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}}');
 if e#>>'{claims,app_metadata,tenant_id}' is not null then raise exception 'hook retained revoked claim'; end if;
 if has_function_privilege('authenticated','public.app_tenant_access_token_hook(jsonb)','execute') then raise exception 'browser may mint claims'; end if;
end $$;
rollback;
