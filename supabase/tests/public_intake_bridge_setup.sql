\set ON_ERROR_STOP on

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE TABLE public.app_companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  active boolean NOT NULL DEFAULT true,
  public_form boolean NOT NULL DEFAULT true
);

CREATE TABLE public.app_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.app_companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  customer text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  value numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  status text NOT NULL DEFAULT 'new'
);

-- Model a legacy browser-callable overload that the hardening migration must revoke.
CREATE FUNCTION public.app_submit_public_lead(uuid,text,text,text,text,text,text,numeric)
RETURNS uuid LANGUAGE sql AS 'SELECT gen_random_uuid()';
GRANT EXECUTE ON FUNCTION public.app_submit_public_lead(uuid,text,text,text,text,text,text,numeric) TO anon;

INSERT INTO public.app_companies(id, name, slug)
VALUES
  ('10000000-0000-4000-8000-000000000001', 'Synthetic Company A', 'firma-a'),
  ('20000000-0000-4000-8000-000000000002', 'Synthetic Company B', 'firma-b');

-- Deliberately do not create app_public_intake_events. The staging bridge must do that.
