BEGIN;
SELECT plan(29);

SELECT is((SELECT count(*)::integer FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND left(c.relname,4)='app_' AND c.relkind IN ('r','p')), 19, 'fixture covers the complete 19-table app_* catalog snapshot');
SELECT ok((SELECT bool_and(c.relrowsecurity AND c.relforcerowsecurity=(c.relname=ANY(ARRAY['app_platform_admins','app_platform_audit_events','app_platform_support_sessions']))) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND left(c.relname,4)='app_' AND c.relkind IN ('r','p')), 'RLS and forced-RLS flags match the full app_* matrix');
SELECT ok((SELECT bool_and(NOT (has_table_privilege('anon',format('%I.%I',n.nspname,c.relname),'SELECT') OR has_table_privilege('anon',format('%I.%I',n.nspname,c.relname),'INSERT') OR has_table_privilege('anon',format('%I.%I',n.nspname,c.relname),'UPDATE') OR has_table_privilege('anon',format('%I.%I',n.nspname,c.relname),'DELETE') OR has_table_privilege('anon',format('%I.%I',n.nspname,c.relname),'TRUNCATE') OR has_table_privilege('anon',format('%I.%I',n.nspname,c.relname),'REFERENCES') OR has_table_privilege('anon',format('%I.%I',n.nspname,c.relname),'TRIGGER'))) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND left(c.relname,4)='app_' AND c.relkind IN ('r','p')), 'anon has no direct app_* table grant');
SELECT ok((SELECT bool_and(NOT (has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'SELECT') OR has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'INSERT') OR has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'UPDATE') OR has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'DELETE') OR has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'TRUNCATE') OR has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'REFERENCES') OR has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'TRIGGER'))) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('app_ai_inbox_events','app_company_legal_acceptances','app_dead_lead_notifications','app_email_outbox','app_imports','app_paid_registration_intents','app_platform_admins','app_platform_audit_events','app_platform_support_sessions','app_public_intake_events','app_stripe_webhook_events','app_workspace_defaults')), 'authenticated has no direct service-only grants');
SELECT ok((SELECT bool_and(
  has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'SELECT')=(c.relname=ANY(ARRAY['app_companies','app_members','app_invites','app_leads','app_lead_events','app_lead_files','app_lead_notes']))
  AND has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'INSERT')=(c.relname=ANY(ARRAY['app_members','app_invites','app_leads','app_lead_notes','app_lead_files']))
  AND has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'UPDATE')=(c.relname=ANY(ARRAY['app_companies','app_members','app_invites','app_leads']))
  AND has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'DELETE')=(c.relname=ANY(ARRAY['app_members','app_invites','app_leads','app_lead_notes','app_lead_files']))
  AND NOT has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'TRUNCATE')
  AND NOT has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'REFERENCES')
  AND NOT has_table_privilege('authenticated',format('%I.%I',n.nspname,c.relname),'TRIGGER')) FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND left(c.relname,4)='app_' AND c.relkind IN ('r','p')), 'authenticated direct grants match the seven-table matrix');
SELECT ok((SELECT bool_and(
  has_table_privilege('service_role',format('%I.%I',n.nspname,c.relname),'SELECT')=(c.relname<>'app_stripe_webhook_events')
  AND has_table_privilege('service_role',format('%I.%I',n.nspname,c.relname),'INSERT')=(c.relname<>'app_stripe_webhook_events')
  AND has_table_privilege('service_role',format('%I.%I',n.nspname,c.relname),'UPDATE')=(c.relname NOT IN ('app_stripe_webhook_events','app_company_legal_acceptances'))
  AND has_table_privilege('service_role',format('%I.%I',n.nspname,c.relname),'DELETE')=(c.relname NOT IN ('app_stripe_webhook_events','app_company_legal_acceptances'))
  AND has_table_privilege('service_role',format('%I.%I',n.nspname,c.relname),'TRUNCATE')=(c.relname NOT IN ('app_stripe_webhook_events','app_company_legal_acceptances'))
  AND has_table_privilege('service_role',format('%I.%I',n.nspname,c.relname),'REFERENCES')=(c.relname NOT IN ('app_stripe_webhook_events','app_company_legal_acceptances'))
  AND has_table_privilege('service_role',format('%I.%I',n.nspname,c.relname),'TRIGGER')=(c.relname NOT IN ('app_stripe_webhook_events','app_company_legal_acceptances')))
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND left(c.relname,4)='app_' AND c.relkind IN ('r','p')), 'service role grants match the reviewed table matrix');
SELECT ok(has_table_privilege('service_role','public.app_company_legal_acceptances','SELECT') AND has_table_privilege('service_role','public.app_company_legal_acceptances','INSERT') AND NOT has_table_privilege('service_role','public.app_company_legal_acceptances','UPDATE') AND NOT has_table_privilege('service_role','public.app_company_legal_acceptances','DELETE'), 'legal acceptance grant remains append-only');
SELECT ok(NOT has_table_privilege('authenticated','public.app_imports','SELECT') AND NOT has_table_privilege('authenticated','public.app_public_intake_events','SELECT'), 'server-only tables retain direct-deny grants');
SELECT ok((SELECT count(*)=2 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND c.relname IN ('app_imports','app_public_intake_events') AND p.polcmd='*' AND pg_get_expr(p.polqual,p.polrelid)='false' AND pg_get_expr(p.polwithcheck,p.polrelid)='false' AND 'anon'::regrole::oid=ANY(p.polroles) AND 'authenticated'::regrole::oid=ANY(p.polroles)), 'direct-deny policies cover anon and authenticated explicitly');
SELECT ok((SELECT count(*)=7 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public' AND p.polname='app_jwt_tenant_boundary' AND NOT p.polpermissive AND p.polcmd='*'), 'all seven tenant tables have restrictive JWT boundaries');

SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',true);
SELECT is((SELECT count(*)::integer FROM public.app_companies), 1, 'owner sees only its company root');
SELECT is((SELECT count(*)::integer FROM public.app_members), 4, 'owner sees only same-tenant memberships');
SELECT is((SELECT count(*)::integer FROM public.app_invites), 1, 'owner sees only same-tenant invites');
SELECT is((SELECT count(*)::integer FROM public.app_leads), 1, 'permissive legacy lead policy cannot bypass tenant boundary');
SELECT is((SELECT count(*)::integer FROM public.app_lead_events), 1, 'owner sees only same-tenant lead events');
SELECT is((SELECT count(*)::integer FROM public.app_lead_notes), 1, 'owner sees only same-tenant notes');
SELECT is((SELECT count(*)::integer FROM public.app_lead_files), 1, 'owner sees only same-tenant files');
SELECT set_config('request.jwt.claims','{"user_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',true);
SELECT is((SELECT count(*)::integer FROM public.app_leads), 0, 'user_metadata cannot authorize tenant access');
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"malformed"}}',true);
SELECT is((SELECT count(*)::integer FROM public.app_leads), 0, 'malformed tenant claim denies access');
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',true);
UPDATE public.app_leads SET title='tenant A update' WHERE id='a1000000-0000-4000-8000-000000000001';
SELECT is((SELECT title FROM public.app_leads WHERE id='a1000000-0000-4000-8000-000000000001'), 'tenant A update', 'same-tenant update remains available');
SELECT is((WITH changed AS (UPDATE public.app_leads SET title='cross tenant' WHERE id='b1000000-0000-4000-8000-000000000002' RETURNING id) SELECT count(*)::integer FROM changed), 0, 'cross-tenant update affects no row');
SELECT throws_ok($q$ INSERT INTO public.app_leads(id,company_id,title) VALUES ('c1000000-0000-4000-8000-000000000001','b0000000-0000-4000-8000-000000000002','forged') $q$, '42501', NULL, 'cross-tenant insert is denied by WITH CHECK');

SELECT set_config('request.jwt.claim.sub','30000000-0000-4000-8000-000000000003',true);
SELECT is((SELECT count(*)::integer FROM public.app_leads), 1, 'employee sees the assigned same-tenant lead');
SELECT is((WITH changed AS (UPDATE public.app_leads SET title='employee update' WHERE id='a1000000-0000-4000-8000-000000000001' RETURNING id) SELECT count(*)::integer FROM changed), 1, 'employee can update an assigned lead');
SELECT throws_ok($q$ UPDATE public.app_leads SET company_id='b0000000-0000-4000-8000-000000000002' WHERE id='a1000000-0000-4000-8000-000000000001' $q$, '42501', NULL, 'employee cannot reassign a lead across tenants');
INSERT INTO public.app_leads(id,company_id,title,assigned_to,created_by) VALUES
('a3000000-0000-4000-8000-000000000003','a0000000-0000-4000-8000-000000000001','employee-created','30000000-0000-4000-8000-000000000003','10000000-0000-4000-8000-000000000001');
SELECT is((SELECT created_by FROM public.app_leads WHERE id='a3000000-0000-4000-8000-000000000003'), '30000000-0000-4000-8000-000000000003'::uuid, 'database trigger replaces a forged creator');
SELECT throws_ok($q$ UPDATE public.app_leads SET created_by='10000000-0000-4000-8000-000000000001' WHERE id='a3000000-0000-4000-8000-000000000003' $q$, '42501', 'lead creator is immutable', 'employee cannot rewrite creator identity');
SELECT is((WITH deleted AS (DELETE FROM public.app_leads WHERE id='a3000000-0000-4000-8000-000000000003' RETURNING id) SELECT count(*)::integer FROM deleted), 1, 'creator can hard-delete an assigned lead within the existing window');
RESET ROLE;
SET LOCAL ROLE authenticated;
SELECT set_config('request.jwt.claim.sub','10000000-0000-4000-8000-000000000001',true);
SELECT set_config('request.jwt.claims','{"app_metadata":{"tenant_id":"a0000000-0000-4000-8000-000000000001"}}',true);
SELECT is((WITH deleted AS (DELETE FROM public.app_leads WHERE id='a1000000-0000-4000-8000-000000000001' RETURNING id) SELECT count(*)::integer FROM deleted), 1, 'owner can still hard-delete a same-tenant lead');

RESET ROLE;
SELECT * FROM finish();
ROLLBACK;
