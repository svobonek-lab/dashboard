\set ON_ERROR_STOP on
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',false);
DO $$
DECLARE r record;
BEGIN
 SELECT * INTO r FROM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','contacted');
 IF r.lead_id <> 'a1000000-0000-4000-8000-000000000001' OR r.status <> 'contacted' THEN RAISE EXCEPTION 'owner status failed'; END IF;
END $$;
RESET ROLE;
DO $$
BEGIN
 IF (SELECT status FROM public.app_leads WHERE id='a1000000-0000-4000-8000-000000000001') <> 'contacted' THEN RAISE EXCEPTION 'status unchanged'; END IF;
 IF (SELECT count(*) FROM public.app_audit) <> 1 THEN RAISE EXCEPTION 'audit missing'; END IF;
END $$;
SET ROLE authenticated;
DO $$
DECLARE failed boolean;
BEGIN
 PERFORM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','contacted');
 failed:=false;
 BEGIN PERFORM public.app_change_lead_status('b1000000-0000-4000-8000-000000000002','won'); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'cross tenant accepted'; END IF;
 failed:=false;
 BEGIN PERFORM public.app_change_lead_status('f1000000-0000-4000-8000-000000000001','won'); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'missing lead accepted'; END IF;
 failed:=false;
 BEGIN PERFORM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','invalid'); EXCEPTION WHEN check_violation THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'invalid status accepted'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN IF (SELECT count(*) FROM public.app_audit) <> 1 THEN RAISE EXCEPTION 'no-op or failed request audited'; END IF; END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','40000000-0000-4000-8000-000000000004',false);
DO $$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','won'); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'unassigned employee accepted'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','50000000-0000-4000-8000-000000000005',false);
DO $$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','won'); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'inactive member accepted'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003',false);
SELECT * FROM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','scheduled');
DO $$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','won'); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'employee skipped lifecycle to won'; END IF;
END $$;
RESET ROLE;
DO $$ BEGIN IF (SELECT count(*) FROM public.app_audit) <> 2 THEN RAISE EXCEPTION 'assigned employee audit missing'; END IF; END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',false);
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"b0000000-0000-4000-8000-000000000002"}}',false);
SELECT * FROM public.app_change_lead_status('b1000000-0000-4000-8000-000000000002','contacted');
RESET ROLE;
DO $$ BEGIN IF (SELECT count(*) FROM public.app_audit) <> 3 THEN RAISE EXCEPTION 'owner B audit missing'; END IF; END $$;
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',false);
SELECT * FROM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','won');
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003',false);
DO $$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','contacted'); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'employee reopened completed lead'; END IF;
END $$;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',false);
SELECT * FROM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','contacted');
RESET ROLE;
DO $$ BEGIN IF (SELECT count(*) FROM public.app_audit) <> 5 THEN RAISE EXCEPTION 'owner reopening audit missing'; END IF; END $$;
INSERT INTO public.app_company_database_settings VALUES ('a0000000-0000-4000-8000-000000000001','byodb');
SET ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003',false);
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',false);
DO $$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','won'); EXCEPTION WHEN SQLSTATE '55000' THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'BYODB cloud write accepted'; END IF;
END $$;
RESET ROLE;
ALTER TABLE public.app_leads DISABLE TRIGGER app_block_cloud_lead_writes_for_byodb;
SET ROLE authenticated;
DO $$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','in_progress'); EXCEPTION WHEN SQLSTATE '55000' THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'BYODB accepted with disabled trigger'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{}',false);
DO $$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','won'); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'missing tenant claim accepted'; END IF;
END $$;
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',false);
SELECT set_config('request.jwt.claim.sub','',false);
DO $$
DECLARE failed boolean:=false;
BEGIN
 BEGIN PERFORM public.app_change_lead_status('a1000000-0000-4000-8000-000000000001','won'); EXCEPTION WHEN insufficient_privilege THEN failed:=true; END;
 IF NOT failed THEN RAISE EXCEPTION 'missing actor accepted'; END IF;
END $$;
RESET ROLE;
DO $$
BEGIN
 IF has_function_privilege('anon','public.app_change_lead_status(uuid,text)','EXECUTE') THEN RAISE EXCEPTION 'anon can execute'; END IF;
 IF has_table_privilege('authenticated','public.app_leads','UPDATE') THEN RAISE EXCEPTION 'browser table update grant expanded'; END IF;
 IF (SELECT count(*) FROM public.app_audit) <> 5 THEN RAISE EXCEPTION 'failed request audited'; END IF;
END $$;
