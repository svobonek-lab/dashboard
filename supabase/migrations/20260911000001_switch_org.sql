-- MIGRATION: ADD organization_members AND switch_organization RPC

-- Create organization_members table
CREATE TABLE IF NOT EXISTS public.organization_members (
    user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    role text NOT NULL DEFAULT 'employee',
    PRIMARY KEY (user_id, organization_id)
);

-- Enable RLS on organization_members
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- SELECT policy: Users can see their own memberships OR super admins can see all
DROP POLICY IF EXISTS select_organization_members ON public.organization_members;
CREATE POLICY select_organization_members ON public.organization_members
    FOR SELECT
    USING (user_id = auth.uid() OR public.auth_is_super_admin() = true);

-- INSERT policy: Users can insert their own memberships OR super admins can do so
DROP POLICY IF EXISTS insert_organization_members ON public.organization_members;
CREATE POLICY insert_organization_members ON public.organization_members
    FOR INSERT
    WITH CHECK (user_id = auth.uid() OR public.auth_is_super_admin() = true);

-- UPDATE/DELETE policies: Only super admins or owners can update/delete memberships
DROP POLICY IF EXISTS update_organization_members ON public.organization_members;
CREATE POLICY update_organization_members ON public.organization_members
    FOR UPDATE
    USING (user_id = auth.uid() OR public.auth_is_super_admin() = true);

DROP POLICY IF EXISTS delete_organization_members ON public.organization_members;
CREATE POLICY delete_organization_members ON public.organization_members
    FOR DELETE
    USING (user_id = auth.uid() OR public.auth_is_super_admin() = true);


-- RPC function to switch organizations safely
CREATE OR REPLACE FUNCTION public.switch_organization(target_org_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Ověř, že aktuální uživatel je členem cílové organizace přes tabulku organization_members
  -- (nebo je super_admin)
  IF NOT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = auth.uid() AND organization_id = target_org_id
  ) AND NOT public.auth_is_super_admin() THEN
    RAISE EXCEPTION 'Nejste členem této organizace';
  END IF;

  -- Update users table with target organization_id
  UPDATE public.users SET organization_id = target_org_id WHERE id = auth.uid();
END;
$$;
