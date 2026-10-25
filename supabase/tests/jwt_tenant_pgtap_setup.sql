-- Disposable pgTAP fixture. Synthetic rows only; never run against Supabase.
CREATE EXTENSION IF NOT EXISTS pgtap;

-- The broad legacy policy belongs only in the pre-migration red test.
DROP POLICY legacy_leads ON public.app_leads;

ALTER TABLE public.app_leads ADD COLUMN IF NOT EXISTS created_by uuid;
ALTER TABLE public.app_leads ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.app_leads ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'new';
ALTER TABLE public.app_leads ADD COLUMN IF NOT EXISTS revision integer NOT NULL DEFAULT 1;
ALTER TABLE public.app_leads ADD COLUMN IF NOT EXISTS import_fingerprint text;
ALTER TABLE public.app_leads ADD COLUMN IF NOT EXISTS source_record_id text;
ALTER TABLE public.app_leads ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE TABLE public.app_invites (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, email text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.app_lead_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, lead_id uuid NOT NULL, actor_id uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.app_lead_notes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, lead_id uuid NOT NULL, author_id uuid NOT NULL, body text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.app_lead_files (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, lead_id uuid NOT NULL, author_id uuid NOT NULL, storage_path text NOT NULL, file_name text NOT NULL, mime_type text NOT NULL, size_bytes bigint NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.app_public_intake_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, request_key text NOT NULL, lead_id uuid, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.app_imports (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, fingerprint text NOT NULL, status text NOT NULL DEFAULT 'completed');
CREATE TABLE public.app_ai_inbox_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, request_key text NOT NULL, lead_id uuid);
CREATE TABLE public.app_email_outbox (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, recipient text NOT NULL, subject text NOT NULL, body text NOT NULL DEFAULT '', lead_id uuid);
CREATE TABLE public.app_dead_lead_notifications (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, lead_id uuid NOT NULL, outbox_id uuid);
CREATE TABLE public.app_platform_admins (user_id uuid PRIMARY KEY, active boolean NOT NULL DEFAULT true);
CREATE TABLE public.app_platform_support_sessions (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), platform_admin_id uuid NOT NULL, company_id uuid NOT NULL, reason text NOT NULL);
CREATE TABLE public.app_platform_audit_events (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), actor_user_id uuid, company_id uuid, support_session_id uuid, action text NOT NULL);
CREATE TABLE public.app_stripe_webhook_events (event_id text PRIMARY KEY, event_type text NOT NULL, company_id uuid NOT NULL);
CREATE TABLE public.app_company_legal_acceptances (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, invite_id uuid, actor_user_id uuid NOT NULL, accepted_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE public.app_paid_registration_intents (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL UNIQUE, owner_user_id uuid NOT NULL);
CREATE TABLE public.app_workspace_defaults (company_id uuid PRIMARY KEY, settings jsonb NOT NULL DEFAULT '{}'::jsonb);

ALTER TABLE public.app_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_lead_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_lead_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_lead_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_public_intake_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_ai_inbox_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_dead_lead_notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_platform_admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_platform_support_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_platform_audit_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_stripe_webhook_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_company_legal_acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_paid_registration_intents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_workspace_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_platform_admins FORCE ROW LEVEL SECURITY;
ALTER TABLE public.app_platform_support_sessions FORCE ROW LEVEL SECURITY;
ALTER TABLE public.app_platform_audit_events FORCE ROW LEVEL SECURITY;

GRANT USAGE ON SCHEMA public, auth, app_private, storage TO anon, authenticated, service_role, supabase_auth_admin;
GRANT EXECUTE ON FUNCTION app_private.app_role(uuid), app_private.app_can_lead(uuid,uuid) TO authenticated, service_role;
GRANT ALL ON public.app_ai_inbox_events, public.app_companies, public.app_dead_lead_notifications, public.app_email_outbox,
  public.app_imports, public.app_invites, public.app_lead_events, public.app_lead_files, public.app_lead_notes,
  public.app_leads, public.app_members, public.app_paid_registration_intents, public.app_platform_admins,
  public.app_platform_audit_events, public.app_platform_support_sessions, public.app_public_intake_events,
  public.app_workspace_defaults TO service_role;
GRANT SELECT, INSERT ON public.app_company_legal_acceptances TO service_role;
GRANT SELECT, UPDATE ON public.app_companies TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.app_members, public.app_invites, public.app_leads TO authenticated;
GRANT SELECT ON public.app_lead_events TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.app_lead_files, public.app_lead_notes TO authenticated;
REVOKE ALL ON public.app_stripe_webhook_events FROM anon, authenticated, service_role;
REVOKE ALL ON public.app_ai_inbox_events, public.app_company_legal_acceptances, public.app_dead_lead_notifications,
  public.app_email_outbox, public.app_imports, public.app_paid_registration_intents, public.app_platform_admins,
  public.app_platform_audit_events, public.app_platform_support_sessions, public.app_public_intake_events,
  public.app_workspace_defaults FROM anon, authenticated;

CREATE POLICY app_companies_select_member ON public.app_companies FOR SELECT TO authenticated USING (app_private.app_role(id) IS NOT NULL);
CREATE POLICY app_companies_update_owner ON public.app_companies FOR UPDATE TO authenticated USING (app_private.app_role(id) = 'owner') WITH CHECK (app_private.app_role(id) = 'owner');
CREATE POLICY app_members_select_member ON public.app_members FOR SELECT TO authenticated USING (app_private.app_role(company_id) IS NOT NULL);
CREATE POLICY app_members_owner_write ON public.app_members FOR ALL TO authenticated USING (app_private.app_role(company_id) = 'owner') WITH CHECK (app_private.app_role(company_id) = 'owner');
CREATE POLICY app_invites_owner_read ON public.app_invites FOR SELECT TO authenticated USING (app_private.app_role(company_id) = 'owner');
CREATE POLICY app_invites_owner_write ON public.app_invites FOR ALL TO authenticated USING (app_private.app_role(company_id) = 'owner') WITH CHECK (app_private.app_role(company_id) = 'owner');
CREATE POLICY app_leads_select_scoped ON public.app_leads FOR SELECT TO authenticated USING (app_private.app_role(company_id) = 'owner' OR app_private.app_can_lead(company_id, id));
CREATE POLICY app_leads_insert_owner ON public.app_leads FOR INSERT TO authenticated WITH CHECK (app_private.app_role(company_id) = 'owner');
CREATE POLICY app_leads_update_scoped ON public.app_leads FOR UPDATE TO authenticated USING (app_private.app_role(company_id) = 'owner' OR app_private.app_can_lead(company_id, id)) WITH CHECK (app_private.app_role(company_id) = 'owner' OR app_private.app_can_lead(company_id, id));
CREATE POLICY app_leads_delete_creator ON public.app_leads FOR DELETE TO authenticated USING (app_private.app_role(company_id) = 'owner' OR (app_private.app_role(company_id) = 'employee' AND created_by = auth.uid() AND app_private.app_can_lead(company_id, id)));
CREATE POLICY app_leads_delete_creator_boundary ON public.app_leads AS RESTRICTIVE FOR DELETE TO authenticated USING (app_private.app_role(company_id) = 'owner' OR (created_by = auth.uid() AND app_private.app_can_lead(company_id, id)));
CREATE POLICY app_lead_events_read ON public.app_lead_events FOR SELECT TO authenticated USING (app_private.app_role(company_id) = 'owner' OR app_private.app_can_lead(company_id, lead_id));
CREATE POLICY app_lead_notes_select_scoped ON public.app_lead_notes FOR SELECT TO authenticated USING (app_private.app_role(company_id) = 'owner' OR app_private.app_can_lead(company_id, lead_id));
CREATE POLICY app_lead_notes_insert_scoped ON public.app_lead_notes FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND (app_private.app_role(company_id) = 'owner' OR app_private.app_can_lead(company_id, lead_id)));
CREATE POLICY app_lead_notes_delete_scoped ON public.app_lead_notes FOR DELETE TO authenticated USING (app_private.app_role(company_id) = 'owner' OR (app_private.app_can_lead(company_id, lead_id) AND author_id = auth.uid() AND created_at >= clock_timestamp() - interval '15 minutes'));
CREATE POLICY app_lead_files_select_scoped ON public.app_lead_files FOR SELECT TO authenticated USING (app_private.app_role(company_id) = 'owner' OR app_private.app_can_lead(company_id, lead_id));
CREATE POLICY app_lead_files_insert_scoped ON public.app_lead_files FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid() AND (app_private.app_role(company_id) = 'owner' OR app_private.app_can_lead(company_id, lead_id)));
CREATE POLICY app_lead_files_delete_scoped ON public.app_lead_files FOR DELETE TO authenticated USING (app_private.app_role(company_id) = 'owner' OR (app_private.app_can_lead(company_id, lead_id) AND author_id = auth.uid() AND created_at >= clock_timestamp() - interval '15 minutes'));
CREATE POLICY app_imports_deny_direct ON public.app_imports FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);
CREATE POLICY app_public_intake_events_deny_direct ON public.app_public_intake_events FOR ALL TO anon, authenticated USING (false) WITH CHECK (false);

-- Attribute the synthetic assigned lead before installing the immutable creator trigger.
UPDATE public.app_leads SET created_by='30000000-0000-4000-8000-000000000003'
WHERE id='a1000000-0000-4000-8000-000000000001';
INSERT INTO public.app_leads(id,company_id,title,assigned_to,created_by)
VALUES ('a2000000-0000-4000-8000-000000000002','a0000000-0000-4000-8000-000000000001','owner-only','10000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001');

-- Existing source contract: creator identity is assigned by the database and immutable.
CREATE FUNCTION app_private.guard_lead_creator()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=''
AS $$
BEGIN
  IF TG_OP='INSERT' THEN
    IF auth.uid() IS NOT NULL THEN NEW.created_by := auth.uid(); END IF;
  ELSIF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
    RAISE EXCEPTION 'lead creator is immutable' USING errcode='42501';
  END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION app_private.guard_lead_creator() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER app_guard_lead_creator BEFORE INSERT OR UPDATE ON public.app_leads
FOR EACH ROW EXECUTE FUNCTION app_private.guard_lead_creator();

-- Synthetic copy of the checked-in lead mutation contract: employees may only
-- advance status on leads assigned to them; owners control insert and other edits.
CREATE FUNCTION app_private.guard_lead_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp
AS $$
DECLARE v_role text;
BEGIN
  IF TG_OP='UPDATE' AND (NEW.id IS DISTINCT FROM OLD.id OR NEW.company_id IS DISTINCT FROM OLD.company_id) THEN
    RAISE EXCEPTION 'lead identity is immutable' USING errcode='42501';
  END IF;
  IF current_user='authenticated' THEN
    v_role := app_private.app_role(NEW.company_id);
    IF auth.uid() IS NULL OR v_role IS NULL OR NOT EXISTS (
      SELECT 1 FROM public.app_companies c WHERE c.id=NEW.company_id AND c.active
    ) THEN RAISE EXCEPTION 'active company membership required' USING errcode='42501'; END IF;
    IF TG_OP='INSERT' AND v_role<>'owner' THEN
      RAISE EXCEPTION 'only owner can create leads' USING errcode='42501';
    END IF;
    IF TG_OP='UPDATE' AND v_role='employee' THEN
      IF OLD.assigned_to IS DISTINCT FROM auth.uid()
         OR (to_jsonb(NEW)-'status') IS DISTINCT FROM (to_jsonb(OLD)-'status') THEN
        RAISE EXCEPTION 'employee may only update assigned lead status' USING errcode='42501';
      END IF;
      IF NEW.status IS DISTINCT FROM OLD.status AND NOT (
        (OLD.status='new' AND NEW.status IN ('contacted','lost')) OR
        (OLD.status='contacted' AND NEW.status IN ('scheduled','in_progress','lost')) OR
        (OLD.status='scheduled' AND NEW.status IN ('in_progress','lost')) OR
        (OLD.status='in_progress' AND NEW.status IN ('won','lost'))
      ) THEN RAISE EXCEPTION 'invalid employee status transition' USING errcode='42501'; END IF;
    END IF;
  END IF;
  IF TG_OP='UPDATE' THEN NEW.revision:=OLD.revision+1; NEW.updated_at:=clock_timestamp(); END IF;
  RETURN NEW;
END
$$;
REVOKE ALL ON FUNCTION app_private.guard_lead_mutation() FROM PUBLIC,anon,authenticated,service_role;
CREATE TRIGGER app_leads_guard_mutation BEFORE INSERT OR UPDATE ON public.app_leads
FOR EACH ROW EXECUTE FUNCTION app_private.guard_lead_mutation();


INSERT INTO public.app_lead_events(company_id, lead_id, actor_id) VALUES
('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001'),
('b0000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002');
INSERT INTO public.app_invites(company_id,email) VALUES
('a0000000-0000-4000-8000-000000000001','a@example.test'),
('b0000000-0000-4000-8000-000000000002','b@example.test');
INSERT INTO public.app_lead_notes(company_id,lead_id,author_id,body) VALUES
('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','synthetic A'),
('b0000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','synthetic B');
INSERT INTO public.app_lead_files(company_id,lead_id,author_id,storage_path,file_name,mime_type,size_bytes) VALUES
('a0000000-0000-4000-8000-000000000001','a1000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','a/photo.jpg','photo.jpg','image/jpeg',10),
('b0000000-0000-4000-8000-000000000002','b1000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000002','b/photo.jpg','photo.jpg','image/jpeg',10);
INSERT INTO auth.users(id) VALUES
('40000000-0000-4000-8000-000000000004'),
('50000000-0000-4000-8000-000000000005');
INSERT INTO public.app_members(company_id,user_id,role,active) VALUES
('a0000000-0000-4000-8000-000000000001','40000000-0000-4000-8000-000000000004','owner',false),
('a0000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000005','owner',true),
('b0000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000005','employee',true);
