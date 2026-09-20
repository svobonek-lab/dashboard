-- MASTER AUDIT HARDENING MIGRATION (Příloha B - Audit StavbaCore)
-- Hardening RLS, schema extensions, public submission RPC, and outbox tables

-- 1. EXTEND EXISTING TABLES WITH REQUIRED BUSINESS COLUMNS
ALTER TABLE public.leads 
    ADD COLUMN IF NOT EXISTS title text,
    ADD COLUMN IF NOT EXISTS city text,
    ADD COLUMN IF NOT EXISTS address text,
    ADD COLUMN IF NOT EXISTS description text,
    ADD COLUMN IF NOT EXISTS preferred_date text,
    ADD COLUMN IF NOT EXISTS priority text DEFAULT 'Medium',
    ADD COLUMN IF NOT EXISTS assigned_employee_id text,
    ADD COLUMN IF NOT EXISTS assigned_employee_name text,
    ADD COLUMN IF NOT EXISTS thumbnail text,
    ADD COLUMN IF NOT EXISTS photos jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS files jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS checklist jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS ai_summary jsonb,
    ADD COLUMN IF NOT EXISTS timeline jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS ai_chat jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS history jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS voice_notes jsonb DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS source text DEFAULT 'direct',
    ADD COLUMN IF NOT EXISTS sla_minutes integer DEFAULT 15,
    ADD COLUMN IF NOT EXISTS margin numeric,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.users
    ADD COLUMN IF NOT EXISTS name text,
    ADD COLUMN IF NOT EXISTS avatar_url text,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.employees
    ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS avatar text,
    ADD COLUMN IF NOT EXISTS role text DEFAULT 'employee',
    ADD COLUMN IF NOT EXISTS active boolean DEFAULT true,
    ADD COLUMN IF NOT EXISTS status text DEFAULT 'Active',
    ADD COLUMN IF NOT EXISTS invitation_status text DEFAULT 'Active',
    ADD COLUMN IF NOT EXISTS invite_token text,
    ADD COLUMN IF NOT EXISTS invited_at timestamptz,
    ADD COLUMN IF NOT EXISTS activated_at timestamptz;

ALTER TABLE public.organizations
    ADD COLUMN IF NOT EXISTS email text,
    ADD COLUMN IF NOT EXISTS phone text,
    ADD COLUMN IF NOT EXISTS address text,
    ADD COLUMN IF NOT EXISTS ico text,
    ADD COLUMN IF NOT EXISTS dic text,
    ADD COLUMN IF NOT EXISTS iban text,
    ADD COLUMN IF NOT EXISTS bic text,
    ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- 2. CREATE TRANSACTIONAL EMAIL OUTBOX & DEMO BOOKINGS
CREATE TABLE IF NOT EXISTS public.app_email_outbox (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid REFERENCES public.organizations(id) ON DELETE CASCADE,
    recipient text NOT NULL,
    subject text NOT NULL,
    body text,
    body_html text,
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'retry', 'failed')),
    attempts integer NOT NULL DEFAULT 0,
    provider_message_id text,
    scheduled_for timestamptz DEFAULT now(),
    delivered_at timestamptz,
    last_error text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.demo_bookings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    company text NOT NULL,
    phone text NOT NULL,
    email text,
    preferred_time text,
    status text DEFAULT 'new',
    created_at timestamptz DEFAULT now()
);

-- 3. ENABLE RLS ON NEW TABLES
ALTER TABLE public.app_email_outbox ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_bookings ENABLE ROW LEVEL SECURITY;

-- 4. HARDEN LEADS RLS (AUDIT FINDING F-03 & F-04)
-- Revoke direct anon access to prevent unauthenticated database dump
REVOKE SELECT, INSERT, UPDATE, DELETE ON public.leads FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.leads TO authenticated;

DROP POLICY IF EXISTS select_leads ON public.leads;
DROP POLICY IF EXISTS insert_leads ON public.leads;
DROP POLICY IF EXISTS update_leads ON public.leads;
DROP POLICY IF EXISTS delete_leads ON public.leads;

-- SELECT policy: Authenticated users can ONLY view leads belonging to their active organization or if super_admin
CREATE POLICY select_leads ON public.leads
    FOR SELECT
    TO authenticated
    USING (
        organization_id = public.auth_org_id()
        OR public.auth_is_super_admin() = true
    );

-- INSERT policy: Authenticated users can create leads in their own organization
CREATE POLICY insert_leads ON public.leads
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.auth_org_id()
        OR public.auth_is_super_admin() = true
    );

-- UPDATE policy: Authenticated users can update leads in their own organization
CREATE POLICY update_leads ON public.leads
    FOR UPDATE
    TO authenticated
    USING (
        organization_id = public.auth_org_id()
        OR public.auth_is_super_admin() = true
    )
    WITH CHECK (
        organization_id = public.auth_org_id()
        OR public.auth_is_super_admin() = true
    );

-- DELETE policy: Authenticated users can delete leads in their own organization
CREATE POLICY delete_leads ON public.leads
    FOR DELETE
    TO authenticated
    USING (
        organization_id = public.auth_org_id()
        OR public.auth_is_super_admin() = true
    );

-- 5. HARDEN OUTBOX RLS
DROP POLICY IF EXISTS select_outbox ON public.app_email_outbox;
CREATE POLICY select_outbox ON public.app_email_outbox
    FOR SELECT
    TO authenticated
    USING (
        organization_id = public.auth_org_id()
        OR public.auth_is_super_admin() = true
    );

DROP POLICY IF EXISTS insert_outbox ON public.app_email_outbox;
CREATE POLICY insert_outbox ON public.app_email_outbox
    FOR INSERT
    TO authenticated
    WITH CHECK (
        organization_id = public.auth_org_id()
        OR public.auth_is_super_admin() = true
    );

-- 6. HARDEN USERS UPDATE RESTRICTIONS (AUDIT FINDING F-05)
-- Authenticated users cannot self-escalate role or switch organization_id
REVOKE UPDATE (role, organization_id) ON public.users FROM authenticated;
GRANT UPDATE (name, avatar_url, updated_at) ON public.users TO authenticated;

-- 7. SECURE PUBLIC LEAD INGESTION RPC (AUDIT FINDING F-03 / Příloha B)
-- Replaces direct anonymous insert with validated, bounded RPC
CREATE OR REPLACE FUNCTION public.submit_public_lead(
    p_org_id uuid,
    p_customer_name text,
    p_phone text,
    p_email text DEFAULT NULL,
    p_project_type text DEFAULT 'Poptávka z webu',
    p_budget numeric DEFAULT 0,
    p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_org_exists boolean;
    v_new_lead_id uuid;
    v_clean_name text;
    v_clean_phone text;
    v_clean_email text;
    v_clean_project text;
BEGIN
    -- Input length and sanity validation (Anti-DoS / Buffer constraints)
    IF p_org_id IS NULL THEN
        RAISE EXCEPTION 'organization_id is required';
    END IF;

    -- Verify target organization exists and is active
    SELECT EXISTS (
        SELECT 1 FROM public.organizations
        WHERE id = p_org_id AND (status IS NULL OR status = 'Active')
    ) INTO v_org_exists;

    IF NOT v_org_exists THEN
        RAISE EXCEPTION 'Target organization not found or inactive';
    END IF;

    -- Sanitize & bound inputs
    v_clean_name := substr(trim(COALESCE(p_customer_name, 'Zájemce z webu')), 1, 150);
    v_clean_phone := substr(trim(COALESCE(p_phone, '')), 1, 50);
    v_clean_email := substr(trim(COALESCE(p_email, '')), 1, 150);
    v_clean_project := substr(trim(COALESCE(p_project_type, 'Poptávka')), 1, 100);

    IF length(v_clean_phone) < 3 AND length(v_clean_email) < 3 THEN
        RAISE EXCEPTION 'Either a valid phone number or email is required';
    END IF;

    INSERT INTO public.leads (
        organization_id,
        customer_name,
        phone,
        email,
        project_type,
        budget,
        title,
        status,
        priority,
        source,
        notes,
        created_at
    ) VALUES (
        p_org_id,
        v_clean_name,
        v_clean_phone,
        NULLIF(v_clean_email, ''),
        v_clean_project,
        GREATEST(0, COALESCE(p_budget, 0)),
        v_clean_project || ' - ' || v_clean_name,
        'New',
        'High',
        'web_widget',
        substr(trim(COALESCE(p_notes, '')), 1, 2000),
        now()
    )
    RETURNING id INTO v_new_lead_id;

    RETURN v_new_lead_id;
END;
$$;

-- Allow anon and authenticated to execute the secure RPC
REVOKE ALL ON FUNCTION public.submit_public_lead FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_lead TO anon, authenticated, service_role;

-- 8. SECURE ATOMIC TENANT PROVISIONING RPC (AUDIT FINDING F-06)
-- Set search_path and grant solely to service_role to prevent unauthenticated tenant creation
REVOKE EXECUTE ON FUNCTION public.provision_tenant_atomic FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.provision_tenant_atomic FROM anon;
REVOKE EXECUTE ON FUNCTION public.provision_tenant_atomic FROM authenticated;
GRANT EXECUTE ON FUNCTION public.provision_tenant_atomic TO service_role;
