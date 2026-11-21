-- Follow-up to the reviewed lead write contract for hosted Staging.
-- The Supabase-managed auth schema does not delegate USAGE grant rights to postgres.
BEGIN;

DO $preflight$
BEGIN
  IF to_regrole('app_lead_rpc_writer') IS NULL OR
     (SELECT rolcanlogin OR rolbypassrls FROM pg_roles WHERE rolname='app_lead_rpc_writer') OR
     has_any_column_privilege('authenticated','public.app_leads','UPDATE') OR
     (SELECT count(*) FROM pg_proc WHERE pronamespace='public'::regnamespace
      AND proname IN ('app_create_lead','app_assign_lead','app_set_lead_status','app_edit_lead_details')
      AND prosecdef AND proowner='app_lead_rpc_writer'::regrole) <> 4 THEN
    RAISE EXCEPTION 'Expected restricted staging lead contract is absent';
  END IF;
END
$preflight$;

-- These helpers read only the current request identity. Lead reads and writes
-- still run under the dedicated, non-bypass role and its RLS policies.
CREATE FUNCTION app_private.lead_rpc_actor()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT auth.uid() $$;
CREATE FUNCTION app_private.lead_rpc_tenant()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $$ SELECT app_private.jwt_tenant_id() $$;
REVOKE ALL ON FUNCTION app_private.lead_rpc_actor(),app_private.lead_rpc_tenant()
  FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app_private.lead_rpc_actor(),app_private.lead_rpc_tenant()
  TO app_lead_rpc_writer;

DROP POLICY lead_rpc_select ON public.app_leads;
CREATE POLICY lead_rpc_select ON public.app_leads FOR SELECT TO app_lead_rpc_writer
  USING (company_id=(SELECT app_private.lead_rpc_tenant()) AND (
    public.app_role(company_id)='owner' OR
    (public.app_role(company_id)='employee' AND assigned_to=(SELECT app_private.lead_rpc_actor()))
  ));

DROP POLICY lead_rpc_tenant ON public.app_leads;
CREATE POLICY lead_rpc_tenant ON public.app_leads AS RESTRICTIVE FOR ALL TO app_lead_rpc_writer
  USING (company_id=(SELECT app_private.lead_rpc_tenant()))
  WITH CHECK (company_id=(SELECT app_private.lead_rpc_tenant()));

DROP POLICY lead_rpc_insert ON public.app_leads;
CREATE POLICY lead_rpc_insert ON public.app_leads FOR INSERT TO app_lead_rpc_writer
  WITH CHECK (company_id=(SELECT app_private.lead_rpc_tenant()) AND public.app_role(company_id)='owner');

DROP POLICY lead_rpc_update ON public.app_leads;
CREATE POLICY lead_rpc_update ON public.app_leads FOR UPDATE TO app_lead_rpc_writer
  USING (company_id=(SELECT app_private.lead_rpc_tenant()) AND (
    public.app_role(company_id)='owner' OR
    (public.app_role(company_id)='employee' AND assigned_to=(SELECT app_private.lead_rpc_actor()))
  ))
  WITH CHECK (company_id=(SELECT app_private.lead_rpc_tenant()) AND (
    public.app_role(company_id)='owner' OR
    (public.app_role(company_id)='employee' AND assigned_to=(SELECT app_private.lead_rpc_actor()))
  ));

DROP POLICY lead_rpc_record_event ON public.app_lead_events;
CREATE POLICY lead_rpc_record_event ON public.app_lead_events FOR INSERT TO app_lead_rpc_writer
  WITH CHECK (company_id=(SELECT app_private.lead_rpc_tenant()) AND actor_id=(SELECT app_private.lead_rpc_actor())
    AND operation IN ('INSERT','ASSIGNMENT','STATUS','DETAILS')
    AND EXISTS (SELECT 1 FROM public.app_leads l
      WHERE l.id=lead_id AND l.company_id=app_lead_events.company_id));

CREATE OR REPLACE FUNCTION public.app_create_lead(p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  v_tenant uuid := app_private.lead_rpc_tenant();
  v_row public.app_leads;
BEGIN
  IF app_private.lead_rpc_actor() IS NULL OR public.app_role(v_tenant) IS DISTINCT FROM 'owner' THEN
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
    VALUES (v_tenant,v_row.id,app_private.lead_rpc_actor(),'INSERT',v_row.status);
  RETURN app_private.lead_rpc_result(v_row);
END
$function$;

CREATE OR REPLACE FUNCTION public.app_assign_lead(p_lead_id uuid,p_employee_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  v_tenant uuid := app_private.lead_rpc_tenant();
  v_row public.app_leads;
  v_previous uuid;
BEGIN
  IF app_private.lead_rpc_actor() IS NULL OR public.app_role(v_tenant) IS DISTINCT FROM 'owner'
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
      VALUES (v_tenant,p_lead_id,app_private.lead_rpc_actor(),'ASSIGNMENT',v_row.status,v_previous,p_employee_id);
  END IF;
  RETURN app_private.lead_rpc_result(v_row);
END
$function$;

CREATE OR REPLACE FUNCTION public.app_set_lead_status(p_lead_id uuid,p_status text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  v_tenant uuid := app_private.lead_rpc_tenant();
  v_actor uuid := app_private.lead_rpc_actor();
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

CREATE OR REPLACE FUNCTION public.app_edit_lead_details(p_lead_id uuid,p_payload jsonb)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=''
AS $function$
DECLARE
  v_tenant uuid := app_private.lead_rpc_tenant();
  v_row public.app_leads;
BEGIN
  IF app_private.lead_rpc_actor() IS NULL OR public.app_role(v_tenant) IS DISTINCT FROM 'owner' THEN
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
      VALUES (v_tenant,p_lead_id,app_private.lead_rpc_actor(),'DETAILS',v_row.status);
  END IF;
  RETURN app_private.lead_rpc_result(v_row);
END
$function$;

NOTIFY pgrst, 'reload schema';
COMMIT;
