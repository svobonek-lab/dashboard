-- Apply only to isolated Staging after separate review and a disposable test.
BEGIN;

DO $preflight$
BEGIN
  IF has_table_privilege('authenticated','public.app_leads','INSERT')
     OR has_table_privilege('authenticated','public.app_leads','UPDATE')
     OR has_any_column_privilege('authenticated','public.app_leads','UPDATE')
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.app_leads'::regclass)
     OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.app_lead_events'::regclass)
     OR NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.app_leads'::regclass
       AND tgname='app_block_cloud_lead_writes_for_byodb' AND tgenabled IN ('O','A'))
     OR EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.app_leads'::regclass
       AND tgname='app_leads_record_event' AND tgenabled IN ('O','A')) THEN
    RAISE EXCEPTION 'Unexpected staging lead privileges or triggers';
  END IF;
END
$preflight$;

CREATE ROLE app_lead_rpc_writer NOLOGIN NOINHERIT NOBYPASSRLS;
GRANT app_lead_rpc_writer TO CURRENT_USER;
GRANT USAGE ON SCHEMA public, auth, app_private TO app_lead_rpc_writer;
GRANT EXECUTE ON FUNCTION auth.uid(), app_private.jwt_tenant_id(), public.app_role(uuid)
  TO app_lead_rpc_writer;
GRANT SELECT ON public.app_leads TO app_lead_rpc_writer;
GRANT INSERT (company_id,title,customer,email,phone,address,description,scheduled_at,value,priority)
  ON public.app_leads TO app_lead_rpc_writer;
GRANT UPDATE (assigned_to,status,description,address,phone,email,updated_at,revision)
  ON public.app_leads TO app_lead_rpc_writer;

-- The isolated role has its own policies. Existing browser policies are untouched.
CREATE POLICY lead_rpc_select ON public.app_leads FOR SELECT TO app_lead_rpc_writer
  USING (company_id=(SELECT app_private.jwt_tenant_id()) AND (
    public.app_role(company_id)='owner' OR
    (public.app_role(company_id)='employee' AND assigned_to=(SELECT auth.uid()))
  ));
CREATE POLICY lead_rpc_tenant ON public.app_leads AS RESTRICTIVE FOR ALL TO app_lead_rpc_writer
  USING (company_id=(SELECT app_private.jwt_tenant_id()))
  WITH CHECK (company_id=(SELECT app_private.jwt_tenant_id()));
CREATE POLICY lead_rpc_insert ON public.app_leads FOR INSERT TO app_lead_rpc_writer
  WITH CHECK (company_id=(SELECT app_private.jwt_tenant_id()) AND public.app_role(company_id)='owner');
CREATE POLICY lead_rpc_update ON public.app_leads FOR UPDATE TO app_lead_rpc_writer
  USING (company_id=(SELECT app_private.jwt_tenant_id()) AND (
    public.app_role(company_id)='owner' OR
    (public.app_role(company_id)='employee' AND assigned_to=(SELECT auth.uid()))
  ))
  WITH CHECK (company_id=(SELECT app_private.jwt_tenant_id()) AND (
    public.app_role(company_id)='owner' OR
    (public.app_role(company_id)='employee' AND assigned_to=(SELECT auth.uid()))
  ));

-- Staging currently accepts attachment events only. Keep those values and append lead events.
ALTER TABLE public.app_lead_events
  DROP CONSTRAINT app_lead_events_operation_check,
  ADD CONSTRAINT app_lead_events_operation_check
    CHECK (operation IN ('NOTE_ADDED','FILE_ADDED','INSERT','ASSIGNMENT','STATUS','DETAILS')),
  ADD COLUMN old_status text,
  ADD COLUMN old_assigned_to uuid,
  ADD COLUMN new_assigned_to uuid;
CREATE POLICY lead_history_jwt_tenant ON public.app_lead_events AS RESTRICTIVE FOR SELECT TO authenticated
  USING (company_id=(SELECT app_private.jwt_tenant_id()) AND public.app_role(company_id) IS NOT NULL);
GRANT INSERT (company_id,lead_id,actor_id,operation,old_status,new_status,old_assigned_to,new_assigned_to)
  ON public.app_lead_events TO app_lead_rpc_writer;
CREATE POLICY lead_rpc_record_event ON public.app_lead_events FOR INSERT TO app_lead_rpc_writer
  WITH CHECK (company_id=(SELECT app_private.jwt_tenant_id()) AND actor_id=(SELECT auth.uid())
    AND operation IN ('INSERT','ASSIGNMENT','STATUS','DETAILS')
    AND EXISTS (SELECT 1 FROM public.app_leads l
      WHERE l.id=lead_id AND l.company_id=app_lead_events.company_id));

-- Read-only helper so the writer role does not need to read the member directory.
CREATE FUNCTION app_private.lead_rpc_has_employee(p_employee uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $function$
  SELECT EXISTS (SELECT 1 FROM public.app_members m
    WHERE m.company_id=app_private.jwt_tenant_id() AND m.user_id=p_employee
      AND m.role='employee' AND m.active
      AND public.app_role(m.company_id)='owner')
$function$;
REVOKE ALL ON FUNCTION app_private.lead_rpc_has_employee(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.lead_rpc_has_employee(uuid) TO app_lead_rpc_writer;

CREATE FUNCTION app_private.lead_rpc_result(p_row public.app_leads)
RETURNS jsonb LANGUAGE sql IMMUTABLE SET search_path=''
AS $function$
  SELECT jsonb_build_object('id',p_row.id,'company_id',p_row.company_id,'title',p_row.title,
    'customer',p_row.customer,'email',p_row.email,'phone',p_row.phone,'address',p_row.address,
    'description',p_row.description,'status',p_row.status,'priority',p_row.priority,
    'assigned_to',p_row.assigned_to,'scheduled_at',p_row.scheduled_at,
    'duration_minutes',p_row.duration_minutes,'value',p_row.value,'source',p_row.source,
    'created_at',p_row.created_at,'updated_at',p_row.updated_at,'revision',p_row.revision)
$function$;
REVOKE ALL ON FUNCTION app_private.lead_rpc_result(public.app_leads) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.lead_rpc_result(public.app_leads) TO app_lead_rpc_writer;

CREATE FUNCTION public.app_create_lead(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  v_tenant uuid := app_private.jwt_tenant_id();
  v_row public.app_leads;
BEGIN
  IF auth.uid() IS NULL OR public.app_role(v_tenant) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Lead unavailable' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object'
    OR (p_payload - ARRAY['title','customer','email','phone','address','description',
                          'scheduled_at','value','priority']) <> '{}'::jsonb
    OR nullif(btrim(p_payload->>'title'),'') IS NULL
    OR nullif(btrim(p_payload->>'customer'),'') IS NULL
    OR coalesce((p_payload->>'value')::numeric,0) < 0
    OR coalesce(p_payload->>'priority','normal') NOT IN ('low','normal','high') THEN
    RAISE EXCEPTION 'Invalid lead data' USING ERRCODE='22023';
  END IF;
  INSERT INTO public.app_leads(company_id,title,customer,email,phone,address,description,
                               scheduled_at,value,priority)
    VALUES (v_tenant,btrim(p_payload->>'title'),btrim(p_payload->>'customer'),
      coalesce(p_payload->>'email',''),coalesce(p_payload->>'phone',''),
      coalesce(p_payload->>'address',''),coalesce(p_payload->>'description',''),
      (p_payload->>'scheduled_at')::timestamptz,coalesce((p_payload->>'value')::numeric,0),
      coalesce(p_payload->>'priority','normal')) RETURNING * INTO STRICT v_row;
  INSERT INTO public.app_lead_events(company_id,lead_id,actor_id,operation,new_status)
    VALUES (v_tenant,v_row.id,auth.uid(),'INSERT',v_row.status);
  RETURN app_private.lead_rpc_result(v_row);
END
$function$;

CREATE FUNCTION public.app_assign_lead(p_lead_id uuid,p_employee_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  v_tenant uuid := app_private.jwt_tenant_id();
  v_row public.app_leads;
  v_previous uuid;
BEGIN
  IF auth.uid() IS NULL OR public.app_role(v_tenant) IS DISTINCT FROM 'owner'
    OR (p_employee_id IS NOT NULL AND NOT app_private.lead_rpc_has_employee(p_employee_id)) THEN
    RAISE EXCEPTION 'Lead or employee unavailable' USING ERRCODE='42501';
  END IF;
  SELECT * INTO v_row FROM public.app_leads WHERE company_id=v_tenant AND id=p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead or employee unavailable' USING ERRCODE='42501'; END IF;
  v_previous := v_row.assigned_to;
  IF v_previous IS DISTINCT FROM p_employee_id THEN
    UPDATE public.app_leads SET assigned_to=p_employee_id,revision=revision+1,updated_at=clock_timestamp()
      WHERE company_id=v_tenant AND id=p_lead_id RETURNING * INTO STRICT v_row;
    INSERT INTO public.app_lead_events(company_id,lead_id,actor_id,operation,new_status,old_assigned_to,new_assigned_to)
      VALUES (v_tenant,p_lead_id,auth.uid(),'ASSIGNMENT',v_row.status,v_previous,p_employee_id);
  END IF;
  RETURN app_private.lead_rpc_result(v_row);
END
$function$;

CREATE FUNCTION public.app_set_lead_status(p_lead_id uuid,p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  v_tenant uuid := app_private.jwt_tenant_id();
  v_actor uuid := auth.uid();
  v_role text := public.app_role(v_tenant);
  v_row public.app_leads;
  v_previous text;
BEGIN
  IF v_actor IS NULL OR v_role IS NULL OR v_role NOT IN ('owner','employee') THEN
    RAISE EXCEPTION 'Lead unavailable' USING ERRCODE='42501';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('new','contacted','scheduled','in_progress','won','lost') THEN
    RAISE EXCEPTION 'Invalid lead status' USING ERRCODE='23514';
  END IF;
  SELECT * INTO v_row FROM public.app_leads WHERE company_id=v_tenant AND id=p_lead_id FOR UPDATE;
  IF NOT FOUND OR (v_role='employee' AND v_row.assigned_to IS DISTINCT FROM v_actor) THEN
    RAISE EXCEPTION 'Lead unavailable' USING ERRCODE='42501';
  END IF;
  v_previous := v_row.status;
  IF v_previous IS DISTINCT FROM p_status THEN
    IF v_role='employee' AND NOT COALESCE(CASE v_previous
      WHEN 'new' THEN p_status IN ('contacted','lost')
      WHEN 'contacted' THEN p_status IN ('scheduled','in_progress','lost')
      WHEN 'scheduled' THEN p_status IN ('in_progress','lost')
      WHEN 'in_progress' THEN p_status IN ('won','lost')
      ELSE false END,false) THEN
      RAISE EXCEPTION 'Lead transition denied' USING ERRCODE='42501';
    END IF;
    UPDATE public.app_leads SET status=p_status,revision=revision+1,updated_at=clock_timestamp()
      WHERE company_id=v_tenant AND id=p_lead_id RETURNING * INTO STRICT v_row;
    INSERT INTO public.app_lead_events(company_id,lead_id,actor_id,operation,old_status,new_status)
      VALUES (v_tenant,p_lead_id,v_actor,'STATUS',v_previous,v_row.status);
  END IF;
  RETURN app_private.lead_rpc_result(v_row);
END
$function$;

CREATE FUNCTION public.app_edit_lead_details(p_lead_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  v_tenant uuid := app_private.jwt_tenant_id();
  v_row public.app_leads;
BEGIN
  IF auth.uid() IS NULL OR public.app_role(v_tenant) IS DISTINCT FROM 'owner' THEN
    RAISE EXCEPTION 'Lead unavailable' USING ERRCODE='42501';
  END IF;
  IF jsonb_typeof(p_payload) IS DISTINCT FROM 'object'
    OR (p_payload - ARRAY['description','address','phone','email']) <> '{}'::jsonb THEN
    RAISE EXCEPTION 'Invalid lead details' USING ERRCODE='22023';
  END IF;
  SELECT * INTO v_row FROM public.app_leads WHERE company_id=v_tenant AND id=p_lead_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Lead unavailable' USING ERRCODE='42501'; END IF;
  IF (coalesce(p_payload->>'description',v_row.description),coalesce(p_payload->>'address',v_row.address),
      coalesce(p_payload->>'phone',v_row.phone),coalesce(p_payload->>'email',v_row.email))
    IS DISTINCT FROM (v_row.description,v_row.address,v_row.phone,v_row.email) THEN
    UPDATE public.app_leads SET description=coalesce(p_payload->>'description',description),
      address=coalesce(p_payload->>'address',address),phone=coalesce(p_payload->>'phone',phone),
      email=coalesce(p_payload->>'email',email),revision=revision+1,updated_at=clock_timestamp()
      WHERE company_id=v_tenant AND id=p_lead_id RETURNING * INTO STRICT v_row;
    INSERT INTO public.app_lead_events(company_id,lead_id,actor_id,operation,new_status)
      VALUES (v_tenant,p_lead_id,auth.uid(),'DETAILS',v_row.status);
  END IF;
  RETURN app_private.lead_rpc_result(v_row);
END
$function$;

GRANT CREATE ON SCHEMA public TO app_lead_rpc_writer;
ALTER FUNCTION public.app_create_lead(jsonb) OWNER TO app_lead_rpc_writer;
ALTER FUNCTION public.app_assign_lead(uuid,uuid) OWNER TO app_lead_rpc_writer;
ALTER FUNCTION public.app_set_lead_status(uuid,text) OWNER TO app_lead_rpc_writer;
ALTER FUNCTION public.app_edit_lead_details(uuid,jsonb) OWNER TO app_lead_rpc_writer;
REVOKE CREATE ON SCHEMA public FROM app_lead_rpc_writer;
REVOKE ALL ON FUNCTION public.app_create_lead(jsonb),public.app_assign_lead(uuid,uuid),
  public.app_set_lead_status(uuid,text),public.app_edit_lead_details(uuid,jsonb) FROM PUBLIC,anon;
GRANT EXECUTE ON FUNCTION public.app_create_lead(jsonb),public.app_assign_lead(uuid,uuid),
  public.app_set_lead_status(uuid,text),public.app_edit_lead_details(uuid,jsonb) TO authenticated;

-- Preserve the old response shape while removing the nullable authorization check.
CREATE OR REPLACE FUNCTION public.app_change_lead_status(p_lead_id uuid,p_status text)
RETURNS TABLE(lead_id uuid,status text)
LANGUAGE sql SECURITY INVOKER SET search_path=''
AS $function$
  SELECT (r->>'id')::uuid,r->>'status' FROM public.app_set_lead_status(p_lead_id,p_status) r
$function$;

NOTIFY pgrst, 'reload schema';
COMMIT;
