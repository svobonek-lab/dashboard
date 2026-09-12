-- MIGRATION: REAL COMPANY CREATOR & TENANT PROVISIONING
-- Adds extended company columns, company_settings table, employee details, and atomic creation RPC

-- 1. Extend public.organizations table with full company columns
ALTER TABLE public.organizations 
ADD COLUMN IF NOT EXISTS website text,
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS city text,
ADD COLUMN IF NOT EXISTS secondary_color text DEFAULT '#0f172a';

-- 2. Extend public.employees table with contact info
ALTER TABLE public.employees
ADD COLUMN IF NOT EXISTS phone text,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS avatar_url text;

-- 3. Create public.company_settings table for complete White-Label configuration
CREATE TABLE IF NOT EXISTS public.company_settings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL UNIQUE REFERENCES public.organizations(id) ON DELETE CASCADE,
    branding jsonb DEFAULT '{}'::jsonb,
    services jsonb DEFAULT '[]'::jsonb,
    website text,
    address text,
    phone text,
    email text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Enable RLS on company_settings
ALTER TABLE public.company_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_company_settings ON public.company_settings;
CREATE POLICY select_company_settings ON public.company_settings
    FOR SELECT
    USING (
        organization_id = public.auth_org_id()
        OR public.auth_is_super_admin() = true
    );

DROP POLICY IF EXISTS insert_company_settings ON public.company_settings;
CREATE POLICY insert_company_settings ON public.company_settings
    FOR INSERT
    WITH CHECK (
        public.auth_is_super_admin() = true
        OR organization_id = public.auth_org_id()
    );

DROP POLICY IF EXISTS update_company_settings ON public.company_settings;
CREATE POLICY update_company_settings ON public.company_settings
    FOR UPDATE
    USING (
        public.auth_is_super_admin() = true
        OR organization_id = public.auth_org_id()
    )
    WITH CHECK (
        public.auth_is_super_admin() = true
        OR organization_id = public.auth_org_id()
    );

DROP POLICY IF EXISTS delete_company_settings ON public.company_settings;
CREATE POLICY delete_company_settings ON public.company_settings
    FOR DELETE
    USING (public.auth_is_super_admin() = true);
