-- Only run in a disposable database populated by lead_write_contract_setup.sql.
\set ON_ERROR_STOP on
BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',true);

DO $test$
DECLARE
  v_lead jsonb;
  v_id uuid;
  v_employee constant uuid := '30000000-0000-4000-8000-000000000003';
  v_owner constant uuid := '10000000-0000-4000-8000-000000000001';
BEGIN
  v_lead := public.app_create_lead('{"title":"Synthetic candidate","customer":"Synthetic owner"}');
  v_id := (v_lead->>'id')::uuid;
  IF v_id IS NULL OR v_lead->>'status' IS DISTINCT FROM 'new' THEN
    RAISE EXCEPTION 'create did not return the committed lead';
  END IF;
  PERFORM set_config('request.jwt.claim.sub',v_employee::text,true);
  BEGIN
    PERFORM public.app_set_lead_status(v_id,'contacted');
    RAISE EXCEPTION 'employee changed an unassigned lead';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('request.jwt.claim.sub',v_owner::text,true);
  v_lead := public.app_assign_lead(v_id,v_employee);
  IF (v_lead->>'assigned_to')::uuid IS DISTINCT FROM v_employee THEN
    RAISE EXCEPTION 'assignment not acknowledged';
  END IF;
  PERFORM public.app_assign_lead(v_id,v_employee);
  IF (SELECT count(*) FROM public.app_lead_events WHERE lead_id=v_id) <> 2 THEN
    RAISE EXCEPTION 'create and assignment must each record one event';
  END IF;
  IF has_any_column_privilege('authenticated','public.app_leads','UPDATE')
    OR has_table_privilege('authenticated','public.app_leads','UPDATE') THEN
    RAISE EXCEPTION 'browser obtained direct UPDATE';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='app_lead_rpc_writer' AND (rolbypassrls OR rolcanlogin))
    OR has_function_privilege('anon','public.app_assign_lead(uuid,uuid)','EXECUTE')
    OR pg_has_role('authenticated','app_lead_rpc_writer','MEMBER') THEN
    RAISE EXCEPTION 'writer role or RPC grants are too broad';
  END IF;
  PERFORM set_config('request.jwt.claim.sub',v_employee::text,true);
  PERFORM public.app_set_lead_status(v_id,'contacted');
  IF (SELECT count(*) FROM public.app_lead_events WHERE lead_id=v_id) <> 3 THEN
    RAISE EXCEPTION 'assigned employee status history did not persist';
  END IF;
  BEGIN
    PERFORM public.app_assign_lead(v_id,NULL);
    RAISE EXCEPTION 'employee changed assignment';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  PERFORM set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
  PERFORM set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"b0000000-0000-4000-8000-000000000002"}}',true);
  BEGIN
    PERFORM public.app_assign_lead(v_id,NULL);
    RAISE EXCEPTION 'cross-company assignment was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.app_lead_events WHERE lead_id=v_id) THEN
    RAISE EXCEPTION 'cross-company history was visible';
  END IF;
END
$test$;
ROLLBACK;
