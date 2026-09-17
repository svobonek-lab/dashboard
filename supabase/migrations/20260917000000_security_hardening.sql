-- ==============================================================================
-- P0 SECURITY HARDENING & MULTI-TENANT ISOLATION MIGRATION
-- Migration: 20260917000000_security_hardening.sql
-- ==============================================================================

-- 1. Ensure required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Enhance employees table with secure invitation & activation columns
ALTER TABLE IF EXISTS public.employees
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS invite_token text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS invitation_status text DEFAULT 'Pending',
  ADD COLUMN IF NOT EXISTS active boolean DEFAULT true;

-- Ensure indexes for fast tenant filtering & invite lookup
CREATE INDEX IF NOT EXISTS idx_employees_org_id ON public.employees(organization_id);
CREATE INDEX IF NOT EXISTS idx_employees_email ON public.employees(email);
CREATE INDEX IF NOT EXISTS idx_employees_invite_token ON public.employees(invite_token);
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id);

-- 3. Enable RLS on all core tables
ALTER TABLE IF EXISTS public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.company_settings ENABLE ROW LEVEL SECURITY;

-- 4. Helper Function: Check User Belongs to Organization
CREATE OR REPLACE FUNCTION public.user_belongs_to_org(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = p_org_id
  ) OR EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND (organization_id = p_org_id OR role = 'superadmin')
  );
$$;

-- 5. Helper Function: Check User Is Owner/Admin of Organization
CREATE OR REPLACE FUNCTION public.user_is_org_admin(p_org_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = p_org_id AND role IN ('owner', 'admin')
  ) OR EXISTS (
    SELECT 1 FROM public.users
    WHERE id = auth.uid() AND ((organization_id = p_org_id AND role IN ('owner', 'admin')) OR role = 'superadmin')
  );
$$;

-- 6. Clean and re-apply RLS Policies for Employees
DROP POLICY IF EXISTS "Allow authenticated read own org employees" ON public.employees;
DROP POLICY IF EXISTS "Allow org admins manage employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public read employees" ON public.employees;

CREATE POLICY "Allow authenticated read own org employees"
  ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    public.user_belongs_to_org(organization_id)
  );

CREATE POLICY "Allow org admins manage employees"
  ON public.employees
  FOR ALL
  TO authenticated
  USING (
    public.user_is_org_admin(organization_id)
  )
  WITH CHECK (
    public.user_is_org_admin(organization_id)
  );

-- 7. Secure Invitation Acceptance RPC Function
CREATE OR REPLACE FUNCTION public.accept_employee_invite(
  p_invite_token text,
  p_new_password text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_emp public.employees%ROWTYPE;
  v_user_id uuid;
BEGIN
  -- Validate invite token
  SELECT * INTO v_emp
  FROM public.employees
  WHERE invite_token = p_invite_token
    AND (invitation_status = 'Pending' OR invitation_status IS NULL);

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Neplatný nebo již použitý token pozvánky.');
  END IF;

  -- Update employee record as active
  UPDATE public.employees
  SET invitation_status = 'Active',
      activated_at = now(),
      invite_token = NULL,
      active = true
  WHERE id = v_emp.id;

  RETURN jsonb_build_object(
    'success', true,
    'employee_id', v_emp.id,
    'email', v_emp.email,
    'organization_id', v_emp.organization_id
  );
END;
$$;
