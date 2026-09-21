-- RPC function to securely load public branding info for embed widget and public forms without leaking private org data

CREATE OR REPLACE FUNCTION public.get_public_org_branding(p_org_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_branding jsonb;
BEGIN
    SELECT jsonb_build_object(
        'id', id,
        'name', name,
        'primary_color', COALESCE(primary_color, '#2563eb'),
        'logo_url', logo_url,
        'status', status
    ) INTO v_branding
    FROM public.organizations
    WHERE id = p_org_id AND (status IS NULL OR status = 'Active');

    RETURN v_branding;
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_org_branding FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_org_branding TO anon, authenticated, service_role;
