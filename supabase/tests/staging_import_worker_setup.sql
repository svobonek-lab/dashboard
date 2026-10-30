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

-- Match the legacy app_imports shape found in the live staging metadata
-- snapshot before the worker proposal is applied.
CREATE TABLE public.app_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.app_companies(id) ON DELETE CASCADE,
  actor uuid NOT NULL,
  file_name text NOT NULL,
  imported integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.app_imports ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.app_imports TO authenticated;
CREATE POLICY import_read ON public.app_imports FOR SELECT TO authenticated USING (true);

CREATE FUNCTION public.app_import_leads(uuid, jsonb, text, text)
RETURNS jsonb LANGUAGE sql AS $$ SELECT '{"legacy":true}'::jsonb $$;
REVOKE ALL ON FUNCTION public.app_import_leads(uuid, jsonb, text, text) FROM public, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.app_import_leads(uuid, jsonb, text, text) TO service_role;

INSERT INTO public.app_companies (id, active) VALUES
  ('10000000-0000-4000-8000-000000000001', true),
  ('20000000-0000-4000-8000-000000000002', false);

INSERT INTO public.app_imports (id, company_id, actor, file_name, imported)
VALUES (
  '30000000-0000-4000-8000-000000000003',
  '10000000-0000-4000-8000-000000000001',
  '40000000-0000-4000-8000-000000000004',
  'legacy-synthetic.csv',
  1
);
