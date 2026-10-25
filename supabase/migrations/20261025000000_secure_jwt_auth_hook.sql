-- Review proposal only. Apply only after operator review and explicit rollout approval.
-- Never run against production/staging as part of this PR's verification.
BEGIN;

DO $preflight$
DECLARE
  expected text[] := ARRAY[
    'app_ai_inbox_events','app_companies','app_company_legal_acceptances',
    'app_dead_lead_notifications','app_email_outbox','app_imports','app_invites',
    'app_lead_events','app_lead_files','app_lead_notes','app_leads','app_members',
    'app_paid_registration_intents','app_platform_admins','app_platform_audit_events',
    'app_platform_support_sessions','app_public_intake_events','app_stripe_webhook_events',
    'app_workspace_defaults'
  ];
  actual text[];
  forced text[];
  tenant_tables text[] := ARRAY[
    'app_companies','app_members','app_invites','app_leads',
    'app_lead_events','app_lead_files','app_lead_notes'
  ];
  service_only text[] := ARRAY[
    'app_ai_inbox_events','app_company_legal_acceptances','app_dead_lead_notifications',
    'app_email_outbox','app_imports','app_paid_registration_intents','app_platform_admins',
    'app_platform_audit_events','app_platform_support_sessions','app_public_intake_events',
    'app_stripe_webhook_events','app_workspace_defaults'
  ];
  t text;
  tenant_key text;
  boundary_count integer;
  policy_row record;
BEGIN
  SELECT array_agg(c.relname ORDER BY c.relname) INTO actual
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND left(c.relname,4)='app_' AND c.relkind IN ('r','p');
  IF actual IS DISTINCT FROM expected THEN
    RAISE EXCEPTION 'JWT tenant migration blocked: public app_* relation set differs; expected %, found %', expected, actual;
  END IF;

  SELECT array_agg(c.relname ORDER BY c.relname) INTO forced
  FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND left(c.relname,4)='app_' AND c.relkind IN ('r','p') AND c.relforcerowsecurity;
  IF forced IS DISTINCT FROM ARRAY['app_platform_admins','app_platform_audit_events','app_platform_support_sessions']::text[] THEN
    RAISE EXCEPTION 'JWT tenant migration blocked: forced-RLS table set differs: %', forced;
  END IF;

  IF to_regprocedure('app_private.app_role(uuid)') IS NULL
     OR to_regprocedure('app_private.app_can_lead(uuid,uuid)') IS NULL THEN
    RAISE EXCEPTION 'JWT tenant migration blocked: required live membership helper signature is missing';
  END IF;
  IF (SELECT p.prorettype<>'text'::regtype FROM pg_proc p WHERE p.oid=to_regprocedure('app_private.app_role(uuid)'))
     OR (SELECT p.prorettype<>'boolean'::regtype FROM pg_proc p WHERE p.oid=to_regprocedure('app_private.app_can_lead(uuid,uuid)')) THEN
    RAISE EXCEPTION 'JWT tenant migration blocked: membership helper return contract differs';
  END IF;
  IF to_regprocedure('app_private.guard_lead_creator()') IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_trigger tr
    JOIN pg_class c ON c.oid=tr.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='app_leads'
      AND tr.tgname='app_guard_lead_creator' AND tr.tgenabled='O'
      AND tr.tgfoid=to_regprocedure('app_private.guard_lead_creator()')
      AND tr.tgtype=23 AND tr.tgqual IS NULL AND array_length(tr.tgattr,1) IS NULL
      AND NOT tr.tgisinternal
  ) THEN
    RAISE EXCEPTION 'JWT tenant migration blocked: immutable app_leads creator trigger contract is missing';
  END IF;
  IF to_regprocedure('app_private.guard_lead_mutation()') IS NULL OR NOT EXISTS (
    SELECT 1 FROM pg_trigger tr
    JOIN pg_class c ON c.oid=tr.tgrelid
    JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relname='app_leads'
      AND tr.tgname='app_leads_guard_mutation' AND tr.tgenabled='O'
      AND tr.tgfoid=to_regprocedure('app_private.guard_lead_mutation()')
      AND tr.tgtype=23 AND tr.tgqual IS NULL AND array_length(tr.tgattr,1) IS NULL
      AND NOT tr.tgisinternal
  ) THEN
    RAISE EXCEPTION 'JWT tenant migration blocked: app_leads mutation guard trigger contract is missing';
  END IF;
  IF EXISTS (
    SELECT 1 FROM (VALUES
      ('app_companies','id','uuid'),('app_companies','active','boolean'),
      ('app_members','company_id','uuid'),('app_members','user_id','uuid'),
      ('app_members','role','text'),('app_members','active','boolean'),
      ('app_leads','id','uuid'),('app_leads','company_id','uuid'),
      ('app_leads','assigned_to','uuid'),('app_leads','created_by','uuid')
    ) AS required(table_name,column_name,data_type)
    WHERE NOT EXISTS (
      SELECT 1 FROM information_schema.columns col
      WHERE col.table_schema='public' AND col.table_name=required.table_name
        AND col.column_name=required.column_name AND col.data_type=required.data_type
    )
  ) THEN
    RAISE EXCEPTION 'JWT tenant migration blocked: a required membership, company, or lead column has changed';
  END IF;

  FOREACH t IN ARRAY expected LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND c.relrowsecurity
    ) THEN
      RAISE EXCEPTION 'JWT tenant migration blocked: RLS is not enabled on public.%', t;
    END IF;
    IF has_table_privilege('anon',format('public.%I',t),'SELECT')
       OR has_table_privilege('anon',format('public.%I',t),'INSERT')
       OR has_table_privilege('anon',format('public.%I',t),'UPDATE')
       OR has_table_privilege('anon',format('public.%I',t),'DELETE')
       OR has_table_privilege('anon',format('public.%I',t),'TRUNCATE')
       OR has_table_privilege('anon',format('public.%I',t),'REFERENCES')
       OR has_table_privilege('anon',format('public.%I',t),'TRIGGER')
       OR has_any_column_privilege('anon',format('public.%I',t),'SELECT')
       OR has_any_column_privilege('anon',format('public.%I',t),'INSERT')
       OR has_any_column_privilege('anon',format('public.%I',t),'UPDATE')
       OR has_any_column_privilege('anon',format('public.%I',t),'REFERENCES') THEN
      RAISE EXCEPTION 'JWT tenant migration blocked: anon has a direct table grant on public.%', t;
    END IF;
  END LOOP;

  FOREACH t IN ARRAY tenant_tables LOOP
    tenant_key := CASE WHEN t='app_companies' THEN 'id' ELSE 'company_id' END;
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name=tenant_key
    ) THEN
      RAISE EXCEPTION 'JWT tenant migration blocked: public.%.% is missing', t, tenant_key;
    END IF;
    IF has_table_privilege('authenticated',format('public.%I',t),'SELECT') IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'JWT tenant migration blocked: authenticated SELECT contract differs for public.%', t;
    END IF;
    IF has_table_privilege('authenticated',format('public.%I',t),'INSERT') IS DISTINCT FROM (t=ANY(ARRAY['app_members','app_invites','app_leads','app_lead_notes','app_lead_files']))
       OR has_table_privilege('authenticated',format('public.%I',t),'UPDATE') IS DISTINCT FROM (t=ANY(ARRAY['app_companies','app_members','app_invites','app_leads']))
       OR has_table_privilege('authenticated',format('public.%I',t),'DELETE') IS DISTINCT FROM (t=ANY(ARRAY['app_members','app_invites','app_leads','app_lead_notes','app_lead_files']))
       OR has_table_privilege('authenticated',format('public.%I',t),'TRUNCATE')
       OR has_table_privilege('authenticated',format('public.%I',t),'REFERENCES')
       OR has_table_privilege('authenticated',format('public.%I',t),'TRIGGER')
       OR (NOT (t=ANY(ARRAY['app_members','app_invites','app_leads','app_lead_notes','app_lead_files'])) AND has_any_column_privilege('authenticated',format('public.%I',t),'INSERT'))
       OR (NOT (t=ANY(ARRAY['app_companies','app_members','app_invites','app_leads'])) AND has_any_column_privilege('authenticated',format('public.%I',t),'UPDATE'))
       OR has_any_column_privilege('authenticated',format('public.%I',t),'REFERENCES') THEN
      RAISE EXCEPTION 'JWT tenant migration blocked: authenticated mutation grants differ for public.%', t;
    END IF;
    IF EXISTS (
      SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t
        AND (p.polroles IS DISTINCT FROM ARRAY['authenticated'::regrole::oid]
          OR (p.polcmd IN ('a','w','*') AND p.polwithcheck IS NULL))
    ) THEN
      RAISE EXCEPTION 'JWT tenant migration blocked: policy role or mutation WITH CHECK contract differs for public.%', t;
    END IF;
  END LOOP;

  FOREACH t IN ARRAY service_only LOOP
    IF has_table_privilege('authenticated',format('public.%I',t),'SELECT')
       OR has_table_privilege('authenticated',format('public.%I',t),'INSERT')
       OR has_table_privilege('authenticated',format('public.%I',t),'UPDATE')
       OR has_table_privilege('authenticated',format('public.%I',t),'DELETE')
       OR has_table_privilege('authenticated',format('public.%I',t),'TRUNCATE')
       OR has_table_privilege('authenticated',format('public.%I',t),'REFERENCES')
       OR has_table_privilege('authenticated',format('public.%I',t),'TRIGGER')
       OR has_any_column_privilege('authenticated',format('public.%I',t),'SELECT')
       OR has_any_column_privilege('authenticated',format('public.%I',t),'INSERT')
       OR has_any_column_privilege('authenticated',format('public.%I',t),'UPDATE')
       OR has_any_column_privilege('authenticated',format('public.%I',t),'REFERENCES') THEN
      RAISE EXCEPTION 'JWT tenant migration blocked: authenticated has a direct service-only grant on public.%', t;
    END IF;
  END LOOP;
  FOREACH t IN ARRAY expected LOOP
    IF t='app_stripe_webhook_events' THEN
      IF has_table_privilege('service_role',format('public.%I',t),'SELECT')
         OR has_table_privilege('service_role',format('public.%I',t),'INSERT')
         OR has_table_privilege('service_role',format('public.%I',t),'UPDATE')
          OR has_table_privilege('service_role',format('public.%I',t),'DELETE')
          OR has_table_privilege('service_role',format('public.%I',t),'TRUNCATE')
          OR has_table_privilege('service_role',format('public.%I',t),'REFERENCES')
          OR has_table_privilege('service_role',format('public.%I',t),'TRIGGER')
          OR has_any_column_privilege('service_role',format('public.%I',t),'SELECT')
          OR has_any_column_privilege('service_role',format('public.%I',t),'INSERT')
          OR has_any_column_privilege('service_role',format('public.%I',t),'UPDATE')
          OR has_any_column_privilege('service_role',format('public.%I',t),'REFERENCES') THEN
        RAISE EXCEPTION 'JWT tenant migration blocked: Stripe service-role grant differs';
      END IF;
    ELSIF t='app_company_legal_acceptances' THEN
      IF has_table_privilege('service_role',format('public.%I',t),'SELECT') IS DISTINCT FROM true
         OR has_table_privilege('service_role',format('public.%I',t),'INSERT') IS DISTINCT FROM true
         OR has_table_privilege('service_role',format('public.%I',t),'UPDATE')
          OR has_table_privilege('service_role',format('public.%I',t),'DELETE')
          OR has_table_privilege('service_role',format('public.%I',t),'TRUNCATE')
          OR has_table_privilege('service_role',format('public.%I',t),'REFERENCES')
          OR has_table_privilege('service_role',format('public.%I',t),'TRIGGER')
          OR has_any_column_privilege('service_role',format('public.%I',t),'UPDATE')
          OR has_any_column_privilege('service_role',format('public.%I',t),'REFERENCES') THEN
        RAISE EXCEPTION 'JWT tenant migration blocked: legal-acceptance service-role grant differs';
      END IF;
    ELSIF has_table_privilege('service_role',format('public.%I',t),'SELECT') IS DISTINCT FROM true
       OR has_table_privilege('service_role',format('public.%I',t),'INSERT') IS DISTINCT FROM true
       OR has_table_privilege('service_role',format('public.%I',t),'UPDATE') IS DISTINCT FROM true
       OR has_table_privilege('service_role',format('public.%I',t),'DELETE') IS DISTINCT FROM true THEN
      RAISE EXCEPTION 'JWT tenant migration blocked: service-role grant differs for public.%', t;
    END IF;
  END LOOP;

  IF has_table_privilege('authenticated','public.app_companies','INSERT')
     OR has_table_privilege('authenticated','public.app_companies','DELETE')
     OR has_table_privilege('authenticated','public.app_lead_events','INSERT')
     OR has_table_privilege('authenticated','public.app_lead_events','UPDATE')
     OR has_table_privilege('authenticated','public.app_lead_events','DELETE')
     OR has_table_privilege('authenticated','public.app_lead_notes','UPDATE')
     OR has_table_privilege('authenticated','public.app_lead_files','UPDATE') THEN
    RAISE EXCEPTION 'JWT tenant migration blocked: authenticated direct mutation grant differs';
  END IF;

  FOREACH t IN ARRAY ARRAY['app_imports','app_public_intake_events'] LOOP
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND p.polcmd='*'
        AND pg_get_expr(p.polqual,p.polrelid)='false'
        AND pg_get_expr(p.polwithcheck,p.polrelid)='false'
        AND 'anon'::regrole::oid=ANY(p.polroles)
        AND 'authenticated'::regrole::oid=ANY(p.polroles)
    ) THEN
      RAISE EXCEPTION 'JWT tenant migration blocked: explicit anon/auth deny policy is missing on public.%', t;
    END IF;
  END LOOP;

  SELECT count(*) INTO boundary_count FROM pg_policy p
  JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname=ANY(tenant_tables) AND p.polname='app_jwt_tenant_boundary';
  IF boundary_count NOT IN (0, cardinality(tenant_tables)) THEN
    RAISE EXCEPTION 'JWT tenant migration blocked: only % of % restrictive tenant boundaries exist', boundary_count, cardinality(tenant_tables);
  END IF;
  IF boundary_count=cardinality(tenant_tables) THEN
    FOREACH t IN ARRAY tenant_tables LOOP
      tenant_key := CASE WHEN t='app_companies' THEN 'id' ELSE 'company_id' END;
      SELECT p.polpermissive,p.polcmd,p.polroles,pg_get_expr(p.polqual,p.polrelid) AS using_expr,
        pg_get_expr(p.polwithcheck,p.polrelid) AS check_expr
      INTO policy_row
      FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND p.polname='app_jwt_tenant_boundary';
      IF policy_row.polpermissive OR policy_row.polcmd<>'*'
         OR policy_row.polroles IS DISTINCT FROM ARRAY['authenticated'::regrole::oid]
         OR policy_row.using_expr NOT ILIKE '%jwt_tenant_id%'
         OR policy_row.check_expr NOT ILIKE '%jwt_tenant_id%'
         OR policy_row.using_expr NOT ILIKE '%app_role%'
         OR policy_row.check_expr NOT ILIKE '%app_role%'
         OR policy_row.using_expr NOT ILIKE '%'||tenant_key||'%'
         OR policy_row.check_expr NOT ILIKE '%'||tenant_key||'%' THEN
        RAISE EXCEPTION 'JWT tenant migration blocked: existing boundary on public.% is incompatible', t;
      END IF;
    END LOOP;
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION app_private.jwt_tenant_id()
RETURNS uuid
LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=''
AS $function$
DECLARE
  tenant_text text := auth.jwt() -> 'app_metadata' ->> 'tenant_id';
BEGIN
  IF tenant_text IS NULL OR tenant_text !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    RETURN NULL;
  END IF;
  RETURN tenant_text::uuid;
END
$function$;
REVOKE ALL ON FUNCTION app_private.jwt_tenant_id() FROM PUBLIC,anon,authenticated,service_role,supabase_auth_admin;
GRANT USAGE ON SCHEMA app_private TO authenticated;
GRANT EXECUTE ON FUNCTION app_private.jwt_tenant_id() TO authenticated;

CREATE OR REPLACE FUNCTION public.app_tenant_access_token_hook(event jsonb)
RETURNS jsonb
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  user_id_text text := event->>'user_id';
  claim_set jsonb := event->'claims';
  app_meta jsonb;
  tenant_count bigint := 0;
  tenant_id uuid;
  tenant_role text;
BEGIN
  IF jsonb_typeof(event) IS DISTINCT FROM 'object' THEN
    RETURN event;
  END IF;
  IF jsonb_typeof(claim_set) IS DISTINCT FROM 'object' THEN
    claim_set := '{}'::jsonb;
  END IF;
  app_meta := claim_set->'app_metadata';
  IF jsonb_typeof(app_meta) IS DISTINCT FROM 'object' THEN
    app_meta := '{}'::jsonb;
  END IF;
  app_meta := app_meta - 'tenant_id' - 'tenant_role';

  IF user_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
    SELECT count(*),min(m.company_id::text)::uuid,min(m.role)
      INTO tenant_count,tenant_id,tenant_role
    FROM public.app_members AS m
    JOIN public.app_companies AS c ON c.id=m.company_id AND c.active IS TRUE
    WHERE m.user_id=user_id_text::uuid AND m.active IS TRUE
      AND m.role IN ('owner','employee');
    IF tenant_count=1 THEN
      app_meta := jsonb_set(app_meta,'{tenant_id}',to_jsonb(tenant_id::text),true);
      app_meta := jsonb_set(app_meta,'{tenant_role}',to_jsonb(tenant_role),true);
    END IF;
  END IF;

  claim_set := jsonb_set(claim_set,'{app_metadata}',app_meta,true);
  RETURN jsonb_set(event,'{claims}',claim_set,true);
END
$function$;
REVOKE ALL ON FUNCTION public.app_tenant_access_token_hook(jsonb) FROM PUBLIC,anon,authenticated,service_role,supabase_auth_admin;
GRANT EXECUTE ON FUNCTION public.app_tenant_access_token_hook(jsonb) TO supabase_auth_admin;

DO $boundaries$
DECLARE
  t text;
  tenant_key text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_companies','app_members','app_invites','app_leads',
    'app_lead_events','app_lead_files','app_lead_notes'
  ] LOOP
    tenant_key := CASE WHEN t='app_companies' THEN 'id' ELSE 'company_id' END;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
      JOIN pg_namespace n ON n.oid=c.relnamespace
      WHERE n.nspname='public' AND c.relname=t AND p.polname='app_jwt_tenant_boundary'
    ) THEN
      EXECUTE format(
        'CREATE POLICY app_jwt_tenant_boundary ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (%I=(SELECT app_private.jwt_tenant_id()) AND app_private.app_role(%I) IS NOT NULL) WITH CHECK (%I=(SELECT app_private.jwt_tenant_id()) AND app_private.app_role(%I) IS NOT NULL)',
        t,tenant_key,tenant_key,tenant_key,tenant_key
      );
    END IF;
  END LOOP;
END
$boundaries$;

COMMIT;
