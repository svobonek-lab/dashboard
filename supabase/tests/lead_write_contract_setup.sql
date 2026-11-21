-- Extends the existing disposable staging status baseline with the observed lead shape.
ALTER FUNCTION public.app_block_cloud_lead_writes_for_byodb() SECURITY DEFINER;
ALTER FUNCTION public.app_block_cloud_lead_writes_for_byodb() SET search_path TO public, pg_temp;
DROP TRIGGER app_block_cloud_lead_writes_for_byodb ON public.app_leads;
CREATE TRIGGER app_block_cloud_lead_writes_for_byodb BEFORE INSERT OR UPDATE OR DELETE ON public.app_leads
  FOR EACH ROW EXECUTE FUNCTION public.app_block_cloud_lead_writes_for_byodb();
ALTER TABLE public.app_leads
  ALTER COLUMN id SET DEFAULT gen_random_uuid(),
  ALTER COLUMN status SET DEFAULT 'new',
  ADD COLUMN title text NOT NULL DEFAULT '',
  ADD COLUMN customer text NOT NULL DEFAULT '',
  ADD COLUMN email text NOT NULL DEFAULT '',
  ADD COLUMN phone text NOT NULL DEFAULT '',
  ADD COLUMN address text NOT NULL DEFAULT '',
  ADD COLUMN description text NOT NULL DEFAULT '',
  ADD COLUMN priority text NOT NULL DEFAULT 'normal',
  ADD COLUMN scheduled_at timestamptz,
  ADD COLUMN duration_minutes int NOT NULL DEFAULT 60,
  ADD COLUMN value numeric NOT NULL DEFAULT 0,
  ADD COLUMN source text NOT NULL DEFAULT 'manual',
  ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN revision int NOT NULL DEFAULT 1;
CREATE TABLE public.app_lead_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  lead_id uuid NOT NULL,
  actor_id uuid,
  operation text NOT NULL CHECK (operation IN ('NOTE_ADDED','FILE_ADDED')),
  new_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
ALTER TABLE public.app_lead_events ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.app_lead_events TO authenticated;
CREATE POLICY scoped_history ON public.app_lead_events FOR SELECT TO authenticated
  USING (company_id=app_private.jwt_tenant_id() AND EXISTS (
    SELECT 1 FROM public.app_leads l WHERE l.id=lead_id AND l.company_id=app_lead_events.company_id
    AND (public.app_role(l.company_id)='owner' OR l.assigned_to=auth.uid())
  ));
