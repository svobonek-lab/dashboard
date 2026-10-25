BEGIN;
SELECT plan(10);

SELECT ok(to_regprocedure('public.app_tenant_access_token_hook(jsonb)') IS NOT NULL, 'Auth hook exists');
SELECT is(public.app_tenant_access_token_hook('{"user_id":"10000000-0000-4000-8000-000000000001","claims":{"role":"authenticated"}}'::jsonb)#>>'{claims,app_metadata,tenant_id}', 'a0000000-0000-4000-8000-000000000001', 'owner receives the sole active tenant');
SELECT is(public.app_tenant_access_token_hook('{"user_id":"10000000-0000-4000-8000-000000000001","claims":{}}'::jsonb)#>>'{claims,app_metadata,tenant_role}', 'owner', 'owner role is placed in trusted app metadata');
SELECT is(public.app_tenant_access_token_hook('{"user_id":"30000000-0000-4000-8000-000000000003","claims":{"user_metadata":{"tenant_id":"b0000000-0000-4000-8000-000000000002"},"app_metadata":{"tenant_id":"b0000000-0000-4000-8000-000000000002","tenant_role":"owner"}}}'::jsonb)#>>'{claims,app_metadata,tenant_id}', 'a0000000-0000-4000-8000-000000000001', 'client metadata cannot override live membership');
SELECT is(public.app_tenant_access_token_hook('{"user_id":"30000000-0000-4000-8000-000000000003","claims":{"app_metadata":{"tenant_role":"owner"}}}'::jsonb)#>>'{claims,app_metadata,tenant_role}', 'employee', 'role is derived from the active membership');
SELECT is(public.app_tenant_access_token_hook('{"user_id":"40000000-0000-4000-8000-000000000004","claims":{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001","tenant_role":"owner"}}}'::jsonb)#>'{claims,app_metadata}' ? 'tenant_id', false, 'inactive membership clears stale tenant claims');
SELECT is(public.app_tenant_access_token_hook('{"user_id":"50000000-0000-4000-8000-000000000005","claims":{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}}'::jsonb)#>'{claims,app_metadata}' ? 'tenant_id', false, 'ambiguous active membership clears tenant claims');
SELECT is(public.app_tenant_access_token_hook('{"user_id":"60000000-0000-4000-8000-000000000006","claims":{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}}'::jsonb)#>>'{claims,app_metadata,tenant_id}', NULL::text, 'missing membership clears stale tenant claims');
SELECT lives_ok($q$ SELECT public.app_tenant_access_token_hook('{"user_id":"invalid","claims":{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}}'::jsonb) $q$, 'malformed auth event is handled without raising');
SELECT ok(has_function_privilege('supabase_auth_admin','public.app_tenant_access_token_hook(jsonb)','EXECUTE') AND NOT has_function_privilege('anon','public.app_tenant_access_token_hook(jsonb)','EXECUTE') AND NOT has_function_privilege('authenticated','public.app_tenant_access_token_hook(jsonb)','EXECUTE') AND NOT has_function_privilege('service_role','public.app_tenant_access_token_hook(jsonb)','EXECUTE') AND NOT EXISTS (SELECT 1 FROM aclexplode((SELECT coalesce(proacl,acldefault('f',proowner)) FROM pg_proc WHERE oid='public.app_tenant_access_token_hook(jsonb)'::regprocedure)) AS acl WHERE acl.grantee=0 AND acl.privilege_type='EXECUTE'), 'only Supabase Auth admin can execute the hook');

SELECT * FROM finish();
ROLLBACK;
