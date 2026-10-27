-- STAGING ONLY. Candidate reconciled against StavbaCore Staging metadata
-- captured by Actions run 40509027192 and a fresh metadata-only query on 2026-10-27. Never apply to production.
-- Requires the fresh schema/policy/grant preflight below to match exactly.
BEGIN;

LOCK TABLE public.app_companies, public.app_members, public.app_leads IN SHARE ROW EXCLUSIVE MODE;

DO $preflight$
DECLARE
  expected_relations text[] := ARRAY[
    'app_audit','app_companies','app_costs','app_demo_requests','app_email_outbox',
    'app_handovers','app_imports','app_integrations','app_invites','app_invoices',
    'app_job_budgets','app_leads','app_members','app_notes','app_quotes',
    'app_rate_limits','app_reminders','app_requests','app_tasks','app_time_entries'
  ];
  actual_relations text[];
  actual_policy_count integer;
  drift_count integer;
  column_drift_count integer;
BEGIN
  SELECT array_agg(c.relname ORDER BY c.relname) INTO actual_relations
  FROM pg_catalog.pg_class c
  JOIN pg_catalog.pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND left(c.relname,4)='app_' AND c.relkind IN ('r','p');
  IF actual_relations IS DISTINCT FROM expected_relations THEN
    RAISE EXCEPTION 'StavbaCore staging reconciliation stopped: app_* relation set changed. Expected %, found %', expected_relations, actual_relations;
  END IF;

  IF to_regprocedure('public.app_role(uuid)') IS NULL
     OR to_regprocedure('public.app_can_lead(uuid,uuid)') IS NULL
     OR to_regprocedure('public.app_is_platform_admin()') IS NULL THEN
    RAISE EXCEPTION 'StavbaCore staging reconciliation stopped: expected public authorization helper signature is missing';
  END IF;
  IF (SELECT p.prorettype<>'text'::regtype FROM pg_proc p WHERE p.oid=to_regprocedure('public.app_role(uuid)'))
     OR (SELECT p.prorettype<>'boolean'::regtype FROM pg_proc p WHERE p.oid=to_regprocedure('public.app_can_lead(uuid,uuid)')) THEN
    RAISE EXCEPTION 'StavbaCore staging reconciliation stopped: helper return type changed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid=to_regprocedure('public.app_role(uuid)') AND p.prosecdef
      AND p.proconfig @> ARRAY['search_path=public, pg_temp']
  ) OR NOT EXISTS (
    SELECT 1 FROM pg_proc p
    WHERE p.oid=to_regprocedure('public.app_can_lead(uuid,uuid)') AND p.prosecdef
      AND p.proconfig @> ARRAY['search_path=public, pg_temp']
  ) THEN
    RAISE EXCEPTION 'StavbaCore staging reconciliation stopped: membership helper security contract changed';
  END IF;

  IF to_regclass('public.app_companies') IS NULL OR to_regclass('public.app_members') IS NULL
     OR to_regclass('public.app_leads') IS NULL
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_companies' AND column_name='active' AND data_type='boolean')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_members' AND column_name='company_id' AND data_type='uuid')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_members' AND column_name='user_id' AND data_type='uuid')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_members' AND column_name='role' AND data_type='text')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_members' AND column_name='active' AND data_type='boolean')
     OR NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='app_leads' AND column_name='company_id' AND data_type='uuid') THEN
    RAISE EXCEPTION 'StavbaCore staging reconciliation stopped: required tenant columns changed';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname=ANY(expected_relations) AND NOT c.relrowsecurity
  ) THEN
    RAISE EXCEPTION 'StavbaCore staging reconciliation stopped: RLS is not enabled on every app_* relation';
  END IF;

  -- Match the full rendered policy inventory, names, commands, roles and kind.
  WITH expected(table_name,policy_name,command) AS (VALUES
    ('app_audit','audit_read','r'),
    ('app_companies','company_read','r'),('app_companies','company_update','w'),
    ('app_costs','cost_delete','d'),('app_costs','cost_insert','a'),('app_costs','cost_read','r'),
    ('app_demo_requests','platform_read_demo_requests','r'),('app_demo_requests','platform_update_demo_requests','w'),
    ('app_email_outbox','outbox_read','r'),('app_handovers','handover_read','r'),('app_imports','import_read','r'),
    ('app_integrations','integration_delete','d'),('app_integrations','integration_insert','a'),('app_integrations','integration_read','r'),('app_integrations','integration_update','w'),
    ('app_invites','invite_delete','d'),('app_invites','invite_read','r'),('app_invoices','invoice_all','*'),
    ('app_job_budgets','owner_budget_insert','a'),('app_job_budgets','owner_budget_select','r'),('app_job_budgets','owner_budget_update','w'),
    ('app_leads','lead_read','r'),('app_members','member_read','r'),
    ('app_notes','note_insert','a'),('app_notes','note_read','r'),('app_quotes','quote_read','r'),
    ('app_rate_limits','rate_server_only','*'),('app_reminders','reminder_all','*'),('app_requests','request_server_only','*'),
    ('app_tasks','task_delete','d'),('app_tasks','task_insert','a'),('app_tasks','task_read','r'),('app_tasks','task_update','w'),
    ('app_time_entries','time_delete','d'),('app_time_entries','time_insert','a'),('app_time_entries','time_read','r')
  ), actual AS (
    SELECT c.relname AS table_name,p.polname AS policy_name,p.polcmd::text AS command,
      p.polpermissive,p.polroles
    FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND left(c.relname,4)='app_'
  )
  SELECT count(*) INTO drift_count
  FROM expected e FULL JOIN actual a USING (table_name,policy_name,command)
  WHERE e.policy_name IS NULL OR a.policy_name IS NULL OR a.polpermissive IS DISTINCT FROM true
    OR a.polroles IS DISTINCT FROM ARRAY['authenticated'::regrole::oid];
  SELECT count(*) INTO actual_policy_count FROM pg_policy p
  JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND left(c.relname,4)='app_';
  IF drift_count<>0 OR actual_policy_count<>36 THEN
    RAISE EXCEPTION 'StavbaCore staging reconciliation stopped: policy inventory drift (% rows, % total)', drift_count, actual_policy_count;
  END IF;

  -- This exact baseline was re-read from pg_class.relacl after the first
  -- metadata snapshot omitted table ACLs. Do not treat existing grants as drift.
  WITH expected(table_name,can_select,can_insert,can_update,can_delete) AS (VALUES
    ('app_audit',true,false,false,false),
    ('app_companies',true,false,false,false),
    ('app_costs',true,true,false,true),
    ('app_demo_requests',true,false,false,false),
    ('app_email_outbox',true,false,false,false),
    ('app_handovers',true,false,false,false),
    ('app_imports',true,false,false,false),
    ('app_integrations',true,true,true,true),
    ('app_invites',true,false,false,true),
    ('app_invoices',true,true,true,true),
    ('app_job_budgets',true,true,false,false),
    ('app_leads',true,false,false,false),
    ('app_members',true,false,false,false),
    ('app_notes',true,true,false,false),
    ('app_quotes',true,false,false,false),
    ('app_rate_limits',false,false,false,false),
    ('app_reminders',true,true,true,true),
    ('app_requests',false,false,false,false),
    ('app_tasks',true,true,false,true),
    ('app_time_entries',true,true,false,true)
  ), actual AS (
    SELECT c.relname AS table_name,
      has_table_privilege('anon',c.oid,'SELECT') AS anon_select,
      has_table_privilege('anon',c.oid,'INSERT') AS anon_insert,
      has_table_privilege('anon',c.oid,'UPDATE') AS anon_update,
      has_table_privilege('anon',c.oid,'DELETE') AS anon_delete,
      has_table_privilege('authenticated',c.oid,'SELECT') AS auth_select,
      has_table_privilege('authenticated',c.oid,'INSERT') AS auth_insert,
      has_table_privilege('authenticated',c.oid,'UPDATE') AS auth_update,
      has_table_privilege('authenticated',c.oid,'DELETE') AS auth_delete
    FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND left(c.relname,4)='app_' AND c.relkind IN ('r','p')
  )
  SELECT count(*) INTO drift_count FROM expected e LEFT JOIN actual a USING (table_name)
  WHERE a.table_name IS NULL
    OR a.anon_select IS DISTINCT FROM false OR a.anon_insert IS DISTINCT FROM false
    OR a.anon_update IS DISTINCT FROM false OR a.anon_delete IS DISTINCT FROM false
    OR a.auth_select IS DISTINCT FROM e.can_select OR a.auth_insert IS DISTINCT FROM e.can_insert
    OR a.auth_update IS DISTINCT FROM e.can_update OR a.auth_delete IS DISTINCT FROM e.can_delete;
  IF drift_count<>0 THEN
    RAISE EXCEPTION 'StavbaCore staging reconciliation stopped: effective table grant matrix changed (% relations)',drift_count;
  END IF;

  -- Preserve exact column-scoped UPDATE grants; converting these to table-wide
  -- UPDATE would expand what authenticated clients may change.
  WITH expected(table_name,column_name,grantee,privilege_type,is_grantable) AS (VALUES
    ('app_companies','address','authenticated','UPDATE',false),
    ('app_companies','color','authenticated','UPDATE',false),
    ('app_companies','dic','authenticated','UPDATE',false),
    ('app_companies','email','authenticated','UPDATE',false),
    ('app_companies','email_notifications','authenticated','UPDATE',false),
    ('app_companies','form_button_label','authenticated','UPDATE',false),
    ('app_companies','form_heading','authenticated','UPDATE',false),
    ('app_companies','form_intro','authenticated','UPDATE',false),
    ('app_companies','form_success_text','authenticated','UPDATE',false),
    ('app_companies','form_success_title','authenticated','UPDATE',false),
    ('app_companies','ico','authenticated','UPDATE',false),
    ('app_companies','logo_url','authenticated','UPDATE',false),
    ('app_companies','name','authenticated','UPDATE',false),
    ('app_companies','onboarding_completed','authenticated','UPDATE',false),
    ('app_companies','phone','authenticated','UPDATE',false),
    ('app_companies','privacy_url','authenticated','UPDATE',false),
    ('app_companies','public_form','authenticated','UPDATE',false),
    ('app_companies','response_target_minutes','authenticated','UPDATE',false),
    ('app_companies','terms_url','authenticated','UPDATE',false),
    ('app_demo_requests','status','authenticated','UPDATE',false),
    ('app_job_budgets','note','authenticated','UPDATE',false),
    ('app_job_budgets','planned_cost','authenticated','UPDATE',false),
    ('app_job_budgets','revenue','authenticated','UPDATE',false),
    ('app_job_budgets','updated_at','authenticated','UPDATE',false),
    ('app_tasks','done','authenticated','UPDATE',false)
  ), actual AS (
    SELECT c.relname AS table_name,a.attname AS column_name,
      COALESCE(r.rolname,'PUBLIC') AS grantee,x.privilege_type,x.is_grantable
    FROM pg_attribute a
    JOIN pg_class c ON c.oid=a.attrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    CROSS JOIN LATERAL pg_catalog.aclexplode(a.attacl) AS x
    LEFT JOIN pg_roles r ON r.oid=x.grantee
    WHERE n.nspname='public' AND left(c.relname,4)='app_' AND c.relkind IN ('r','p')
      AND a.attnum>0 AND NOT a.attisdropped AND a.attacl IS NOT NULL
      AND COALESCE(r.rolname,'PUBLIC') IN ('anon','authenticated','PUBLIC')
      AND x.privilege_type IN ('SELECT','INSERT','UPDATE','REFERENCES')
  )
  SELECT count(*) INTO column_drift_count
  FROM expected e FULL JOIN actual a USING (table_name,column_name,grantee,privilege_type,is_grantable)
  WHERE e.table_name IS NULL OR a.table_name IS NULL;
  IF column_drift_count<>0 THEN
    RAISE EXCEPTION 'StavbaCore staging reconciliation stopped: column-level grant inventory changed (% grants)',column_drift_count;
  END IF;

  IF to_regprocedure('app_private.jwt_tenant_id()') IS NOT NULL
     OR to_regprocedure('public.app_tenant_access_token_hook(jsonb)') IS NOT NULL THEN
    RAISE EXCEPTION 'StavbaCore staging reconciliation stopped: JWT hook objects already exist; inspect before reconciling';
  END IF;
END
$preflight$;

CREATE SCHEMA IF NOT EXISTS app_private;
REVOKE ALL ON SCHEMA app_private FROM PUBLIC,anon;
GRANT USAGE ON SCHEMA app_private TO authenticated;

CREATE FUNCTION app_private.jwt_tenant_id()
RETURNS uuid LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=''
AS $function$
DECLARE tenant_text text := auth.jwt()->'app_metadata'->>'tenant_id';
BEGIN
  IF tenant_text IS NULL OR tenant_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;
  RETURN tenant_text::uuid;
END
$function$;
REVOKE ALL ON FUNCTION app_private.jwt_tenant_id() FROM PUBLIC,anon,authenticated,service_role,supabase_auth_admin;
GRANT EXECUTE ON FUNCTION app_private.jwt_tenant_id() TO authenticated;

CREATE FUNCTION public.app_tenant_access_token_hook(event jsonb)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  user_id_text text := event->>'user_id';
  claims jsonb := event->'claims';
  metadata jsonb;
  tenant_count bigint := 0;
  tenant_id uuid;
BEGIN
  IF jsonb_typeof(event) IS DISTINCT FROM 'object' THEN RETURN event; END IF;
  IF jsonb_typeof(claims) IS DISTINCT FROM 'object' THEN claims := '{}'::jsonb; END IF;
  metadata := claims->'app_metadata';
  IF jsonb_typeof(metadata) IS DISTINCT FROM 'object' THEN metadata := '{}'::jsonb; END IF;
  metadata := metadata-'tenant_id';
  IF user_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT count(*),min(m.company_id::text)::uuid INTO tenant_count,tenant_id
    FROM public.app_members m
    JOIN public.app_companies c ON c.id=m.company_id AND c.active IS TRUE
    WHERE m.user_id=user_id_text::uuid AND m.active IS TRUE AND m.role IN ('owner','employee');
    IF tenant_count=1 THEN metadata:=jsonb_set(metadata,'{tenant_id}',to_jsonb(tenant_id::text),true); END IF;
  END IF;
  claims:=jsonb_set(claims,'{app_metadata}',metadata,true);
  RETURN jsonb_set(event,'{claims}',claims,true);
END
$function$;
REVOKE ALL ON FUNCTION public.app_tenant_access_token_hook(jsonb) FROM PUBLIC,anon,authenticated,service_role,supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.app_tenant_access_token_hook(jsonb) TO supabase_auth_admin;

-- The restrictive JWT condition is AND-ed with the existing, narrower
-- owner/employee/assignment policies. Live membership remains authoritative.
DO $boundaries$
DECLARE t text; tenant_key text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_audit','app_companies','app_costs','app_email_outbox','app_handovers',
    'app_imports','app_integrations','app_invites','app_invoices','app_job_budgets',
    'app_leads','app_members','app_notes','app_quotes','app_reminders','app_requests',
    'app_tasks','app_time_entries'
  ] LOOP
    tenant_key:=CASE WHEN t='app_companies' THEN 'id' ELSE 'company_id' END;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name=t AND column_name=tenant_key AND data_type='uuid') THEN
      RAISE EXCEPTION 'Staging tenant key missing: public.%.%',t,tenant_key;
    END IF;
    EXECUTE format('CREATE POLICY app_jwt_tenant_boundary ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (%I=(SELECT app_private.jwt_tenant_id()) AND public.app_role(%I) IS NOT NULL) WITH CHECK (%I=(SELECT app_private.jwt_tenant_id()) AND public.app_role(%I) IS NOT NULL)',t,tenant_key,tenant_key,tenant_key,tenant_key);
  END LOOP;
END
$boundaries$;

-- Restore only the rights supported by the policies observed in the snapshot.
GRANT SELECT ON public.app_audit, public.app_companies, public.app_demo_requests, public.app_email_outbox,
  public.app_handovers, public.app_imports, public.app_leads, public.app_members,
  public.app_notes, public.app_quotes TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.app_costs TO authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.app_integrations, public.app_invoices,
  public.app_reminders TO authenticated;
GRANT SELECT,DELETE ON public.app_invites TO authenticated;
GRANT SELECT,INSERT ON public.app_job_budgets TO authenticated;
GRANT INSERT ON public.app_notes TO authenticated;
GRANT SELECT,INSERT,DELETE ON public.app_tasks, public.app_time_entries TO authenticated;
-- app_demo_requests retains its existing SELECT and status-only UPDATE column
-- grants under platform-only policies. No new rights are added to server-only
-- rate limits or requests, and no table-wide UPDATE is added to companies,
-- budgets, or tasks; their existing column-scoped grants remain in force.

COMMIT;
