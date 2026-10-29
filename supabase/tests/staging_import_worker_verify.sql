\set ON_ERROR_STOP on

DO $$
BEGIN
  IF has_function_privilege('anon', 'public.app_import_leads(uuid,jsonb,text,text)', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.app_import_leads(uuid,jsonb,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'browser roles must not execute app_import_leads';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.app_import_leads(uuid,jsonb,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'service_role must execute app_import_leads';
  END IF;
  IF has_table_privilege('anon', 'public.app_imports', 'SELECT')
     OR has_table_privilege('authenticated', 'public.app_imports', 'SELECT') THEN
    RAISE EXCEPTION 'browser roles must not read app_imports';
  END IF;
END $$;

SET ROLE service_role;
SELECT public.app_import_leads(
  '10000000-0000-4000-8000-000000000001',
  '[{"title":"Synthetic worker row","customer":"Synthetic","source_record_id":"fixture-1"}]'::jsonb,
  'synthetic.csv',
  'synthetic-fingerprint'
);
RESET ROLE;

DO $$
DECLARE
  v_result jsonb;
  v_count integer;
BEGIN
  SELECT public.app_import_leads(
    '10000000-0000-4000-8000-000000000001',
    '[{"title":"Synthetic worker row","customer":"Synthetic","source_record_id":"fixture-1"}]'::jsonb,
    'synthetic.csv',
    'synthetic-fingerprint'
  ) INTO v_result;
  IF v_result->>'duplicate' <> 'true' THEN
    RAISE EXCEPTION 'repeated import fingerprint must return duplicate=true';
  END IF;
  SELECT count(*) INTO v_count FROM public.app_leads
   WHERE company_id = '10000000-0000-4000-8000-000000000001'
     AND import_fingerprint = 'synthetic-fingerprint';
  IF v_count <> 1 THEN RAISE EXCEPTION 'idempotent import expected one lead, found %', v_count; END IF;

  BEGIN
    PERFORM public.app_import_leads(
      '20000000-0000-4000-8000-000000000002',
      '[{"title":"Must not import","customer":"Synthetic"}]'::jsonb,
      'inactive.csv',
      'inactive-fingerprint'
    );
    RAISE EXCEPTION 'inactive company import unexpectedly succeeded';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'company is not active' THEN RAISE; END IF;
  END;

  v_result := public.app_rollback_import(
    '10000000-0000-4000-8000-000000000001', 'synthetic-fingerprint'
  );
  IF v_result->>'deleted' <> '1' OR v_result->>'status' <> 'rolled_back' THEN
    RAISE EXCEPTION 'rollback did not remove exactly the synthetic imported lead: %', v_result;
  END IF;
END $$;

SELECT 'PASS: service-only import, idempotent replay, inactive tenant rejection, and exact rollback' AS result;
