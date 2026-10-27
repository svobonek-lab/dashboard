-- Synthetic only: proves hook membership selection and two-tenant isolation.
DO $hook_tests$
DECLARE e jsonb;
BEGIN
  e:=public.app_tenant_access_token_hook('{"user_id":"10000000-0000-4000-8000-000000000001","claims":{"app_metadata":{"tenant_id":"b0000000-0000-4000-8000-000000000002"},"user_metadata":{"tenant_id":"b0000000-0000-4000-8000-000000000002"}}}');
  IF e#>>'{claims,app_metadata,tenant_id}'<>'a0000000-0000-4000-8000-000000000001' THEN RAISE EXCEPTION 'owner A did not receive live membership tenant'; END IF;
  e:=public.app_tenant_access_token_hook('{"user_id":"20000000-0000-4000-8000-000000000002","claims":{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}}');
  IF e#>>'{claims,app_metadata,tenant_id}'<>'b0000000-0000-4000-8000-000000000002' THEN RAISE EXCEPTION 'owner B did not receive live membership tenant'; END IF;
  e:=public.app_tenant_access_token_hook('{"user_id":"40000000-0000-4000-8000-000000000004","claims":{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}}');
  IF e#>>'{claims,app_metadata,tenant_id}' IS NOT NULL THEN RAISE EXCEPTION 'ambiguous multi-company membership was authorized'; END IF;
  e:=public.app_tenant_access_token_hook('{"user_id":"50000000-0000-4000-8000-000000000005","claims":{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}}');
  IF e#>>'{claims,app_metadata,tenant_id}' IS NOT NULL THEN RAISE EXCEPTION 'missing membership retained a stale tenant claim'; END IF;
  IF has_function_privilege('authenticated','public.app_tenant_access_token_hook(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'authenticated can execute/mint the Auth hook'; END IF;
  IF NOT has_function_privilege('supabase_auth_admin','public.app_tenant_access_token_hook(jsonb)','EXECUTE') THEN RAISE EXCEPTION 'Auth admin cannot execute the Auth hook'; END IF;
END
$hook_tests$;

-- Add an intentionally broad permissive policy after migration; the restrictive
-- tenant policy must still prevent cross-company reads.
CREATE POLICY staging_test_broad_lead_read ON public.app_leads
  FOR SELECT TO authenticated USING (true);

BEGIN;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',true);
DO $tenant_a$
BEGIN
  IF (SELECT count(*) FROM public.app_companies)<>1 THEN RAISE EXCEPTION 'Tenant A must see exactly its company'; END IF;
  IF (SELECT count(*) FROM public.app_members)<>3 THEN RAISE EXCEPTION 'Tenant A must see only its three memberships'; END IF;
  IF (SELECT count(*) FROM public.app_leads)<>1 THEN RAISE EXCEPTION 'Tenant A must see exactly its lead despite a broad permissive policy'; END IF;
  IF EXISTS (SELECT 1 FROM public.app_leads WHERE company_id='b0000000-0000-4000-8000-000000000002') THEN RAISE EXCEPTION 'Tenant A read Tenant B lead'; END IF;
END
$tenant_a$;

SELECT set_config('request.jwt.claim.sub','20000000-0000-4000-8000-000000000002',true);
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"b0000000-0000-4000-8000-000000000002"}}',true);
DO $tenant_b$
BEGIN
  IF (SELECT count(*) FROM public.app_companies)<>1 THEN RAISE EXCEPTION 'Tenant B must see exactly its company'; END IF;
  IF (SELECT count(*) FROM public.app_members)<>2 THEN RAISE EXCEPTION 'Tenant B must see only its two memberships'; END IF;
  IF (SELECT count(*) FROM public.app_leads)<>1 THEN RAISE EXCEPTION 'Tenant B must see exactly its lead'; END IF;
  IF EXISTS (SELECT 1 FROM public.app_leads WHERE company_id='a0000000-0000-4000-8000-000000000001') THEN RAISE EXCEPTION 'Tenant B read Tenant A lead'; END IF;
END
$tenant_b$;

-- User A forges B's trusted claim; live membership must still deny all access.
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"b0000000-0000-4000-8000-000000000002"},"user_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',true);
DO $forged$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_companies) OR EXISTS (SELECT 1 FROM public.app_leads) THEN RAISE EXCEPTION 'forged tenant claim crossed company boundary'; END IF;
END
$forged$;

SELECT set_config('request.jwt.claims','{"user_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',true);
DO $missing$
BEGIN
  IF EXISTS (SELECT 1 FROM public.app_companies) OR EXISTS (SELECT 1 FROM public.app_leads) THEN RAISE EXCEPTION 'user_metadata authorized database access'; END IF;
END
$missing$;
ROLLBACK;

DO $grants$
BEGIN
  IF has_table_privilege('anon','public.app_leads','SELECT') THEN RAISE EXCEPTION 'anon received a table grant'; END IF;
  IF has_table_privilege('authenticated','public.app_rate_limits','SELECT')
     OR has_table_privilege('authenticated','public.app_requests','SELECT')
     OR has_table_privilege('authenticated','public.app_demo_requests','SELECT') THEN
    RAISE EXCEPTION 'server/platform table received an authenticated grant';
  END IF;
END
$grants$;
