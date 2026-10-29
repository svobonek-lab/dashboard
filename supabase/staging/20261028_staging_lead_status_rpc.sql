-- Review separately before applying to isolated StavbaCore Staging.
BEGIN;
DO $preflight$
DECLARE col record;
BEGIN
  IF to_regclass('public.app_leads') IS NULL OR to_regclass('public.app_audit') IS NULL
     OR to_regprocedure('public.app_role(uuid)') IS NULL
     OR to_regprocedure('app_private.jwt_tenant_id()') IS NULL
     OR to_regprocedure('auth.uid()') IS NULL THEN
    RAISE EXCEPTION 'Lead status RPC preflight: required staging objects missing';
  END IF;
  FOR col IN SELECT * FROM (VALUES
    ('app_leads','id','uuid'),('app_leads','company_id','uuid'),
    ('app_leads','assigned_to','uuid'),('app_leads','status','text'),
    ('app_audit','company_id','uuid'),('app_audit','actor','uuid'),
    ('app_audit','action','text'),('app_audit','entity_id','uuid')
  ) AS required(table_name,column_name,data_type) LOOP
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public'
      AND c.table_name=col.table_name AND c.column_name=col.column_name AND c.udt_name=col.data_type) THEN
      RAISE EXCEPTION 'Lead status RPC preflight: %.% missing or incompatible',col.table_name,col.column_name;
    END IF;
  END LOOP;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema='public'
    AND c.table_name='app_audit' AND c.column_name='id'
    AND (c.column_default IS NOT NULL OR c.is_identity='YES')) THEN
    RAISE EXCEPTION 'Lead status RPC preflight: audit ID has no generator';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.app_leads'::regclass
    AND tgname='app_block_cloud_lead_writes_for_byodb' AND NOT tgisinternal) THEN
    RAISE EXCEPTION 'Lead status RPC preflight: BYODB guard missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='app_leads'
    AND policyname='app_jwt_tenant_boundary' AND permissive='RESTRICTIVE')
    OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.app_leads'::regclass) THEN
    RAISE EXCEPTION 'Lead status RPC preflight: tenant RLS missing';
  END IF;
  IF has_table_privilege('authenticated','public.app_leads','UPDATE')
    OR has_column_privilege('authenticated','public.app_leads','status','UPDATE') THEN
    RAISE EXCEPTION 'Lead status RPC preflight: browser already has direct UPDATE';
  END IF;
END
$preflight$;

CREATE OR REPLACE FUNCTION public.app_change_lead_status(p_lead_id uuid,p_status text)
RETURNS TABLE(lead_id uuid,status text)
LANGUAGE plpgsql VOLATILE SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  v_tenant uuid := app_private.jwt_tenant_id();
  v_actor uuid := auth.uid();
  v_role text;
  v_lead public.app_leads%ROWTYPE;
BEGIN
  IF v_tenant IS NULL OR v_actor IS NULL OR p_lead_id IS NULL THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Lead unavailable';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('new','contacted','scheduled','in_progress','won','lost') THEN
    RAISE EXCEPTION USING ERRCODE='23514',MESSAGE='Invalid lead status';
  END IF;
  SELECT * INTO v_lead FROM public.app_leads l
    WHERE l.company_id=v_tenant AND l.id=p_lead_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Lead unavailable';
  END IF;
  v_role := public.app_role(v_tenant);
  IF v_role IS DISTINCT FROM 'owner'
     AND NOT (v_role='employee' AND v_lead.assigned_to=v_actor) THEN
    RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='Lead unavailable';
  END IF;
  IF v_lead.status IS DISTINCT FROM p_status THEN
    UPDATE public.app_leads l SET status=p_status WHERE l.company_id=v_tenant AND l.id=p_lead_id;
    INSERT INTO public.app_audit(company_id,actor,action,entity_id)
      VALUES(v_tenant,v_actor,'lead_status_changed',p_lead_id);
  END IF;
  lead_id := p_lead_id;
  status := p_status;
  RETURN NEXT;
END
$function$;
REVOKE ALL ON FUNCTION public.app_change_lead_status(uuid,text) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.app_change_lead_status(uuid,text) TO authenticated;
COMMIT;
