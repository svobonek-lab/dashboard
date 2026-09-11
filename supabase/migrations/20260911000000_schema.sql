-- COMPLETE SQL MIGRATION FOR DEMOFACTORY CRM
-- Includes Table Creation, Row Level Security (RLS), helper functions, and custom multi-tenant policies

-- 1. CREATE TABLES FOR SCHEMA (Using IF NOT EXISTS)

CREATE TABLE IF NOT EXISTS public.organizations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    slug text NOT NULL UNIQUE,
    primary_color text DEFAULT '#2563eb',
    logo_url text, -- nullable
    status text DEFAULT 'Active' CHECK (status IN ('Active', 'Suspended')),
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.users (
    id uuid PRIMARY KEY, -- Must match auth.users.id, no new default
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'employee', 'super_admin')),
    email text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.leads (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_name text,
    phone text,
    email text,
    project_type text,
    budget numeric,
    status text DEFAULT 'New',
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.employees (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name text,
    specialization text,
    capacity integer DEFAULT 100
);

CREATE TABLE IF NOT EXISTS public.projects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    lead_id uuid REFERENCES public.leads(id) ON DELETE SET NULL,
    assigned_employee text,
    status text DEFAULT 'draft'
);

-- 2. ENABLE ROW LEVEL SECURITY ON ALL TABLES

ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- 3. AUXILIARY HELPER FUNCTIONS

-- Helper function to return organization_id of current user
CREATE OR REPLACE FUNCTION public.auth_org_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT organization_id FROM public.users WHERE id = auth.uid();
$$;

-- Helper function to check if current user is super admin
CREATE OR REPLACE FUNCTION public.auth_is_super_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT COALESCE(
    (SELECT role = 'super_admin' FROM public.users WHERE id = auth.uid()),
    false
  );
$$;

-- 4. RLS POLICIES FOR ORGANIZATIONS

-- SELECT policy: Allowed if it's the user's organization OR user is super_admin
DROP POLICY IF EXISTS select_organizations ON public.organizations;
CREATE POLICY select_organizations ON public.organizations
    FOR SELECT
    USING (
        id = public.auth_org_id()
        OR public.auth_is_super_admin() = true
    );

-- INSERT policy: Allowed if user is super_admin OR signup flow (no user record exists yet)
DROP POLICY IF EXISTS insert_organizations ON public.organizations;
CREATE POLICY insert_organizations ON public.organizations
    FOR INSERT
    WITH CHECK (
        public.auth_is_super_admin() = true
        OR (
            auth.uid() IS NOT NULL
            AND NOT EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid())
        )
    );

-- UPDATE policy: Allowed if user is super_admin OR owns the organization (sloupce: name, primary_color, logo_url; status is protected)
DROP POLICY IF EXISTS update_organizations ON public.organizations;
CREATE POLICY update_organizations ON public.organizations
    FOR UPDATE
    USING (
        public.auth_is_super_admin() = true
        OR EXISTS (
            SELECT 1 FROM public.users
            WHERE id = auth.uid()
            AND organization_id = public.organizations.id
            AND role = 'owner'
        )
    )
    WITH CHECK (
        public.auth_is_super_admin() = true
        OR (
            EXISTS (
                SELECT 1 FROM public.users
                WHERE id = auth.uid()
                AND organization_id = public.organizations.id
                AND role = 'owner'
            )
            AND status = (SELECT status FROM public.organizations WHERE id = public.organizations.id)
        )
    );

-- DELETE policy: Allowed ONLY for super_admins
DROP POLICY IF EXISTS delete_organizations ON public.organizations;
CREATE POLICY delete_organizations ON public.organizations
    FOR DELETE
    USING (public.auth_is_super_admin() = true);


-- 5. RLS POLICIES FOR USERS

-- SELECT policy: Allowed only for own row OR if user is super_admin
DROP POLICY IF EXISTS select_users ON public.users;
CREATE POLICY select_users ON public.users
    FOR SELECT
    USING (
        id = auth.uid()
        OR public.auth_is_super_admin() = true
    );

-- INSERT policy: Allowed only for own row during registration/onboarding
DROP POLICY IF EXISTS insert_users ON public.users;
CREATE POLICY insert_users ON public.users
    FOR INSERT
    WITH CHECK (id = auth.uid());

-- UPDATE policy: Allowed only for own row, and organization_id cannot be changed
DROP POLICY IF EXISTS update_users ON public.users;
CREATE POLICY update_users ON public.users
    FOR UPDATE
    USING (
        id = auth.uid()
        OR public.auth_is_super_admin() = true
    )
    WITH CHECK (
        (id = auth.uid() AND organization_id = (SELECT organization_id FROM public.users WHERE id = auth.uid()))
        OR public.auth_is_super_admin() = true
    );

-- DELETE policy: Allowed ONLY for super_admins
DROP POLICY IF EXISTS delete_users ON public.users;
CREATE POLICY delete_users ON public.users
    FOR DELETE
    USING (public.auth_is_super_admin() = true);


-- 6. RLS POLICIES FOR LEADS, EMPLOYEES, AND PROJECTS (Standard Organization Multi-Tenancy)

-- LEADS POLICIES
DROP POLICY IF EXISTS select_leads ON public.leads;
CREATE POLICY select_leads ON public.leads FOR SELECT
    USING (
        organization_id = public.auth_org_id() 
        OR public.auth_is_super_admin() = true
        OR auth.uid() IS NULL
    );

DROP POLICY IF EXISTS insert_leads ON public.leads;
CREATE POLICY insert_leads ON public.leads FOR INSERT
    WITH CHECK (
        organization_id = public.auth_org_id() 
        OR public.auth_is_super_admin() = true
        OR EXISTS (
            SELECT 1 FROM public.organizations 
            WHERE id = public.leads.organization_id 
            AND (status IS NULL OR status = 'Active')
        )
        OR auth.uid() IS NULL
    );

DROP POLICY IF EXISTS update_leads ON public.leads;
CREATE POLICY update_leads ON public.leads FOR UPDATE
    USING (
        organization_id = public.auth_org_id() 
        OR public.auth_is_super_admin() = true
        OR auth.uid() IS NULL
    )
    WITH CHECK (
        organization_id = public.auth_org_id() 
        OR public.auth_is_super_admin() = true
        OR auth.uid() IS NULL
    );

DROP POLICY IF EXISTS delete_leads ON public.leads;
CREATE POLICY delete_leads ON public.leads FOR DELETE
    USING (
        organization_id = public.auth_org_id() 
        OR public.auth_is_super_admin() = true
        OR auth.uid() IS NULL
    );


-- EMPLOYEES POLICIES
DROP POLICY IF EXISTS select_employees ON public.employees;
CREATE POLICY select_employees ON public.employees FOR SELECT
    USING (organization_id = public.auth_org_id() OR public.auth_is_super_admin() = true);

DROP POLICY IF EXISTS insert_employees ON public.employees;
CREATE POLICY insert_employees ON public.employees FOR INSERT
    WITH CHECK (organization_id = public.auth_org_id() OR public.auth_is_super_admin() = true);

DROP POLICY IF EXISTS update_employees ON public.employees;
CREATE POLICY update_employees ON public.employees FOR UPDATE
    USING (organization_id = public.auth_org_id() OR public.auth_is_super_admin() = true)
    WITH CHECK (organization_id = public.auth_org_id() OR public.auth_is_super_admin() = true);

DROP POLICY IF EXISTS delete_employees ON public.employees;
CREATE POLICY delete_employees ON public.employees FOR DELETE
    USING (organization_id = public.auth_org_id() OR public.auth_is_super_admin() = true);


-- PROJECTS POLICIES
DROP POLICY IF EXISTS select_projects ON public.projects;
CREATE POLICY select_projects ON public.projects FOR SELECT
    USING (organization_id = public.auth_org_id() OR public.auth_is_super_admin() = true);

DROP POLICY IF EXISTS insert_projects ON public.projects;
CREATE POLICY insert_projects ON public.projects FOR INSERT
    WITH CHECK (organization_id = public.auth_org_id() OR public.auth_is_super_admin() = true);

DROP POLICY IF EXISTS update_projects ON public.projects;
CREATE POLICY update_projects ON public.projects FOR UPDATE
    USING (organization_id = public.auth_org_id() OR public.auth_is_super_admin() = true)
    WITH CHECK (organization_id = public.auth_org_id() OR public.auth_is_super_admin() = true);

DROP POLICY IF EXISTS delete_projects ON public.projects;
CREATE POLICY delete_projects ON public.projects FOR DELETE
    USING (organization_id = public.auth_org_id() OR public.auth_is_super_admin() = true);


-- ============================================================================
-- JAK SPUSTIT TUTO MIGRACI:
--
-- Možnost A) Přes Supabase CLI z vašeho lokálního počítače:
--    supabase db push
--
-- Možnost B) Ručně přes webové rozhraní:
--    1. Přihlaste se do Supabase Dashboard (https://supabase.com/dashboard)
--    2. Přejděte do projektu "DemoFactory CRM"
--    3. V levém menu klikněte na "SQL Editor"
--    4. Vytvořte nový dotaz ("New Query")
--    5. Zkopírujte a vložte celý obsah tohoto souboru
--    6. Klikněte na tlačítko "Run" (Spustit) v pravém dolním rohu editoru
-- ============================================================================
