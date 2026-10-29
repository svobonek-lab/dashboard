CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE ROLE service_role NOLOGIN BYPASSRLS;

CREATE TABLE public.app_companies (
  id uuid PRIMARY KEY,
  active boolean NOT NULL DEFAULT true
);

CREATE TABLE public.app_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.app_companies(id) ON DELETE CASCADE,
  title text NOT NULL,
  customer text NOT NULL,
  email text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'new',
  priority text NOT NULL DEFAULT 'normal',
  scheduled_at timestamptz,
  duration_minutes integer NOT NULL DEFAULT 60,
  value numeric NOT NULL DEFAULT 0,
  source text NOT NULL DEFAULT 'manual',
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.app_companies (id, active) VALUES
  ('10000000-0000-4000-8000-000000000001', true),
  ('20000000-0000-4000-8000-000000000002', false);
