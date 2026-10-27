-- Disposable PostgreSQL fixture shaped from the metadata-only staging snapshot.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE ROLE supabase_auth_admin NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS
  $$ SELECT nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS
  $$ SELECT coalesce(nullif(current_setting('request.jwt.claims',true),''),'{}')::jsonb $$;
GRANT USAGE ON SCHEMA auth TO authenticated,supabase_auth_admin;
GRANT EXECUTE ON FUNCTION auth.uid(),auth.jwt() TO authenticated,supabase_auth_admin;

CREATE TABLE public.app_companies(id uuid PRIMARY KEY,active boolean NOT NULL DEFAULT true);
CREATE TABLE public.app_members(company_id uuid NOT NULL,user_id uuid NOT NULL,role text NOT NULL,active boolean NOT NULL DEFAULT true,PRIMARY KEY(company_id,user_id));
CREATE TABLE public.app_leads(id uuid PRIMARY KEY,company_id uuid NOT NULL,assigned_to uuid);
CREATE TABLE public.app_audit(id uuid,company_id uuid);
CREATE TABLE public.app_costs(id uuid,company_id uuid,lead_id uuid,created_by uuid);
CREATE TABLE public.app_demo_requests(id uuid);
CREATE TABLE public.app_email_outbox(id uuid,company_id uuid);
CREATE TABLE public.app_handovers(id uuid,company_id uuid,lead_id uuid);
CREATE TABLE public.app_imports(id uuid,company_id uuid);
CREATE TABLE public.app_integrations(id uuid,company_id uuid);
CREATE TABLE public.app_invites(id uuid,company_id uuid);
CREATE TABLE public.app_invoices(id uuid,company_id uuid);
CREATE TABLE public.app_job_budgets(company_id uuid,lead_id uuid);
CREATE TABLE public.app_notes(id uuid,company_id uuid,lead_id uuid,author uuid);
CREATE TABLE public.app_quotes(id uuid,company_id uuid);
CREATE TABLE public.app_rate_limits(key text);
CREATE TABLE public.app_reminders(id uuid,company_id uuid);
CREATE TABLE public.app_requests(key text,company_id uuid);
CREATE TABLE public.app_tasks(id uuid,company_id uuid,lead_id uuid);
CREATE TABLE public.app_time_entries(id uuid,company_id uuid,lead_id uuid,member_id uuid);

CREATE FUNCTION public.app_role(c uuid) RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS
$$ SELECT m.role FROM public.app_members m JOIN public.app_companies co ON co.id=m.company_id
   WHERE m.company_id=c AND m.user_id=auth.uid() AND m.active AND co.active $$;
CREATE FUNCTION public.app_can_lead(c uuid,l uuid) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public,pg_temp AS
$$ SELECT EXISTS(SELECT 1 FROM public.app_leads x WHERE x.id=l AND x.company_id=c AND x.assigned_to=auth.uid()) $$;
CREATE FUNCTION public.app_is_platform_admin() RETURNS boolean LANGUAGE sql STABLE AS $$ SELECT false $$;
GRANT EXECUTE ON FUNCTION public.app_role(uuid),public.app_can_lead(uuid,uuid),public.app_is_platform_admin() TO authenticated;

DO $fixture$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'app_audit','app_companies','app_costs','app_demo_requests','app_email_outbox','app_handovers',
    'app_imports','app_integrations','app_invites','app_invoices','app_job_budgets','app_leads',
    'app_members','app_notes','app_quotes','app_rate_limits','app_reminders','app_requests','app_tasks','app_time_entries'
  ] LOOP EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY',t); END LOOP;
END
$fixture$;

DO $policies$
DECLARE p record;
BEGIN
  FOR p IN SELECT * FROM (VALUES
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
  ) AS x(table_name,policy_name,command) LOOP
    EXECUTE CASE p.command
      WHEN 'r' THEN format('CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (true)',p.policy_name,p.table_name)
      WHEN 'a' THEN format('CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (true)',p.policy_name,p.table_name)
      WHEN 'd' THEN format('CREATE POLICY %I ON public.%I FOR DELETE TO authenticated USING (true)',p.policy_name,p.table_name)
      WHEN 'w' THEN format('CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (true) WITH CHECK (true)',p.policy_name,p.table_name)
      ELSE format('CREATE POLICY %I ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true)',p.policy_name,p.table_name)
    END;
  END LOOP;
  ALTER POLICY company_read ON public.app_companies USING (public.app_role(id) IS NOT NULL);
  ALTER POLICY lead_read ON public.app_leads USING (public.app_role(company_id)='owner' OR (public.app_role(company_id)='employee' AND assigned_to=auth.uid()));
  ALTER POLICY member_read ON public.app_members USING (public.app_role(company_id) IS NOT NULL);
  ALTER POLICY rate_server_only ON public.app_rate_limits USING (false) WITH CHECK (false);
  ALTER POLICY request_server_only ON public.app_requests USING (false) WITH CHECK (false);
END
$policies$;

INSERT INTO public.app_companies(id,active) VALUES
 ('a0000000-0000-4000-8000-000000000001',true),('b0000000-0000-4000-8000-000000000002',true);
INSERT INTO public.app_members(company_id,user_id,role,active) VALUES
 ('a0000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','owner',true),
 ('a0000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003','employee',true),
 ('b0000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','owner',true),
 ('a0000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000004','owner',true),
 ('b0000000-0000-4000-8000-000000000002','40000000-0000-4000-8000-000000000004','owner',true);
INSERT INTO public.app_leads(id,company_id,assigned_to) VALUES
 ('a1000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000003'),
 ('b1000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002');
INSERT INTO public.app_notes(id,company_id,lead_id) VALUES
 ('a2000000-0000-4000-8000-000000000001','a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001'),
 ('b2000000-0000-4000-8000-000000000002','b0000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002');
