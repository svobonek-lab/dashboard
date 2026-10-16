-- STAGING-ONLY verification for 20261016_legal_consent_contract.sql. Safe to run after manual application.
begin;

do $$
begin
  if not exists (select 1 from pg_tables where schemaname = 'public' and tablename = 'app_company_legal_acceptances' and rowsecurity) then
    raise exception 'app_company_legal_acceptances must exist with RLS enabled';
  end if;
  if has_table_privilege('authenticated', 'public.app_company_legal_acceptances', 'select')
     or has_table_privilege('anon', 'public.app_company_legal_acceptances', 'insert') then
    raise exception 'legal audit evidence must not be directly accessible to browser roles';
  end if;
  if has_function_privilege('anon', 'public.app_record_owner_legal_consent(uuid,timestamp with time zone)', 'execute') then
    raise exception 'anonymous owner legal-consent RPC access is forbidden';
  end if;
  if not has_function_privilege('authenticated', 'public.app_record_owner_legal_consent(uuid,timestamp with time zone)', 'execute') then
    raise exception 'authenticated owner consent RPC grant is missing';
  end if;
end;
$$;

rollback;