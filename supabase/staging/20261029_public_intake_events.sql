-- STAGING-ONLY schema repair for projects missing the intake idempotency table.
-- Apply only to StavbaCore Staging after review. Do not apply to production.
BEGIN;

DO $preflight$
BEGIN
  IF to_regclass('public.app_companies') IS NULL
     OR to_regclass('public.app_leads') IS NULL THEN
    RAISE EXCEPTION 'Public intake preflight: app_companies and app_leads must exist';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='app_companies'
      AND column_name='id' AND udt_name='uuid'
  ) OR NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='app_leads'
      AND column_name='id' AND udt_name='uuid'
  ) THEN
    RAISE EXCEPTION 'Public intake preflight: company and lead IDs must be UUIDs';
  END IF;
END
$preflight$;

CREATE TABLE IF NOT EXISTS public.app_public_intake_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.app_companies(id) ON DELETE CASCADE,
  request_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, request_key)
);

-- The hardened submission function is SECURITY DEFINER and owns its database
-- work. Browsers and service_role must not access the bookkeeping table directly.
ALTER TABLE public.app_public_intake_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.app_public_intake_events FROM PUBLIC, anon, authenticated, service_role;
DROP POLICY IF EXISTS app_public_intake_events_deny_direct ON public.app_public_intake_events;
CREATE POLICY app_public_intake_events_deny_direct
  ON public.app_public_intake_events
  FOR ALL TO anon, authenticated
  USING (false)
  WITH CHECK (false);

CREATE UNIQUE INDEX IF NOT EXISTS app_public_intake_events_company_request_uidx
  ON public.app_public_intake_events(company_id, request_key);

COMMIT;
