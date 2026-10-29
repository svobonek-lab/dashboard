-- Disposable PostgreSQL fixture only.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE SCHEMA app_private;
GRANT USAGE ON SCHEMA auth, app_private TO authenticated;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS
$$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE SET search_path='' AS
$$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt() TO authenticated;
CREATE TABLE public.app_companies(id uuid PRIMARY KEY,active boolean NOT NULL);
CREATE TABLE public.app_members(company_id uuid,user_id uuid,role text,active boolean);
CREATE TABLE public.app_leads(id uuid PRIMARY KEY,company_id uuid NOT NULL,status text NOT NULL,
  assigned_to uuid, CONSTRAINT app_leads_status_check CHECK(status IN ('new','contacted','scheduled','in_progress','won','lost')));
CREATE TABLE public.app_audit(id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  company_id uuid NOT NULL,actor uuid,action text NOT NULL,entity_id uuid NOT NULL,created_at timestamptz DEFAULT now());
CREATE TABLE public.app_company_database_settings(company_id uuid PRIMARY KEY,mode text NOT NULL);
CREATE FUNCTION public.app_role(p_company_id uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS
$$ SELECT m.role FROM public.app_members m JOIN public.app_companies c ON c.id=m.company_id
   WHERE m.company_id=p_company_id AND m.user_id=auth.uid() AND m.active AND c.active LIMIT 1 $$;
CREATE FUNCTION app_private.jwt_tenant_id() RETURNS uuid LANGUAGE sql STABLE SET search_path='' AS $$
 SELECT CASE WHEN auth.jwt()->'app_metadata'->>'tenant_id' ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
 THEN (auth.jwt()->'app_metadata'->>'tenant_id')::uuid END $$;
GRANT EXECUTE ON FUNCTION app_private.jwt_tenant_id(),public.app_role(uuid) TO authenticated;
CREATE FUNCTION public.app_block_cloud_lead_writes_for_byodb() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS(SELECT 1 FROM public.app_company_database_settings WHERE company_id=coalesce(new.company_id,old.company_id) AND mode='byodb')
 THEN RAISE EXCEPTION USING errcode='55000',message='BYODB_SOURCE_OF_TRUTH'; END IF;
 RETURN new;
END $$;
CREATE TRIGGER app_block_cloud_lead_writes_for_byodb BEFORE UPDATE ON public.app_leads
 FOR EACH ROW EXECUTE FUNCTION public.app_block_cloud_lead_writes_for_byodb();
ALTER TABLE public.app_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_audit ENABLE ROW LEVEL SECURITY;
CREATE POLICY lead_read ON public.app_leads FOR SELECT TO authenticated USING (true);
CREATE POLICY app_jwt_tenant_boundary ON public.app_leads AS RESTRICTIVE FOR ALL TO authenticated
 USING (company_id=app_private.jwt_tenant_id() AND public.app_role(company_id) IS NOT NULL)
 WITH CHECK (company_id=app_private.jwt_tenant_id() AND public.app_role(company_id) IS NOT NULL);
GRANT SELECT ON public.app_leads,public.app_audit TO authenticated;
INSERT INTO public.app_companies VALUES
 ('a0000000-0000-4000-8000-000000000001',true),('b0000000-0000-4000-8000-000000000002',true);
INSERT INTO public.app_members VALUES
 ('a0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','owner',true),
 ('a0000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','employee',true),
 ('a0000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000004','employee',true),
 ('a0000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000005','employee',false),
 ('b0000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','owner',true);
INSERT INTO public.app_leads VALUES
 ('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','new','30000000-0000-4000-8000-000000000003'),
 ('b1000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','new',NULL);
