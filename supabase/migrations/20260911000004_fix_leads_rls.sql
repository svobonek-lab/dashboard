-- MIGRATION: Fix Row Level Security (RLS) policies for leads table
-- Allows public inquiries / web widgets to submit leads to valid organizations,
-- and allows authenticated users and demo sessions to create/manage leads.

-- 1. Update LEADS RLS policies
DROP POLICY IF EXISTS insert_leads ON public.leads;
CREATE POLICY insert_leads ON public.leads FOR INSERT
    WITH CHECK (
        -- Allowed for authenticated organization members
        organization_id = public.auth_org_id()
        -- Allowed for Super Admin
        OR public.auth_is_super_admin() = true
        -- Allowed for anonymous / public inquiry submissions to existing active organizations
        OR EXISTS (
            SELECT 1 FROM public.organizations 
            WHERE id = public.leads.organization_id 
            AND (status IS NULL OR status = 'Active')
        )
        -- Allowed when session is unauthenticated / demo mode
        OR auth.uid() IS NULL
    );

DROP POLICY IF EXISTS select_leads ON public.leads;
CREATE POLICY select_leads ON public.leads FOR SELECT
    USING (
        organization_id = public.auth_org_id() 
        OR public.auth_is_super_admin() = true
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

-- 2. Ensure submit_public_lead RPC exists and is executable by public/anon/authenticated
CREATE OR REPLACE FUNCTION public.submit_public_lead(
  p_org_id uuid,
  p_customer_name text,
  p_phone text,
  p_email text,
  p_project_type text,
  p_budget numeric
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_status text;
  v_new_id uuid;
BEGIN
  -- Validate presence of customer name
  IF p_customer_name IS NULL OR trim(p_customer_name) = '' THEN
    p_customer_name := 'Nová poptávka z webu';
  END IF;

  -- Verify existence and active status of organization
  SELECT status INTO v_org_status FROM public.organizations WHERE id = p_org_id;

  IF v_org_status IS NULL THEN
    -- If organization record not yet in table, allow creation for default demo org or raise
    IF p_org_id = '11111111-2222-4333-8444-444444444444'::uuid THEN
      INSERT INTO public.organizations (id, name, slug, primary_color, status)
      VALUES (p_org_id, 'Pergoly & Terasy Praha s.r.o.', 'pergoly-praha', '#2563eb', 'Active')
      ON CONFLICT (id) DO NOTHING;
    ELSE
      RAISE EXCEPTION 'Organizace nenalezena';
    END IF;
  ELSIF v_org_status = 'Suspended' THEN
    RAISE EXCEPTION 'Tato organizace není aktivní a nemůže přijímat nové poptávky';
  END IF;

  -- Insert the public lead
  INSERT INTO public.leads (organization_id, customer_name, phone, email, project_type, budget, status)
  VALUES (p_org_id, p_customer_name, coalesce(p_phone, ''), coalesce(p_email, ''), coalesce(p_project_type, 'Pergoly'), coalesce(p_budget, 150000), 'New')
  RETURNING id INTO v_new_id;

  RETURN v_new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.submit_public_lead TO anon, authenticated, service_role;
