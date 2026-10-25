BEGIN;
SELECT plan(1);
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',true);
SELECT is((SELECT count(*)::integer FROM public.app_leads), 1, 'Tenant A sees only its own leads');
RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
