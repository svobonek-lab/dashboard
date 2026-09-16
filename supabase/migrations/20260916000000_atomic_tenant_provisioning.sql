-- MIGRATION: ATOMIC TENANT PROVISIONING & RPC FUNCTION
-- Ensures that organization, company_settings, owner user, and membership are created transactionally

CREATE OR REPLACE FUNCTION public.provision_tenant_atomic(
  p_org_id uuid,
  p_name text,
  p_slug text,
  p_website text DEFAULT '',
  p_phone text DEFAULT '',
  p_email text DEFAULT '',
  p_city text DEFAULT '',
  p_address text DEFAULT '',
  p_primary_color text DEFAULT '#2563eb',
  p_secondary_color text DEFAULT '#0f172a',
  p_logo_url text DEFAULT '',
  p_services jsonb DEFAULT '[]'::jsonb,
  p_owner_user_id uuid DEFAULT NULL,
  p_owner_email text DEFAULT '',
  p_owner_name text DEFAULT ''
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_final_slug text := p_slug;
  v_inserted_org public.organizations%ROWTYPE;
BEGIN
  -- 1. Idempotent / Unique slug collision handling
  IF EXISTS (SELECT 1 FROM public.organizations WHERE slug = v_final_slug AND id != p_org_id) THEN
    v_final_slug := v_final_slug || '-' || floor(100 + random() * 900)::int;
  END IF;

  -- 2. Insert or update organization
  INSERT INTO public.organizations (
    id, name, slug, website, phone, email, city, primary_color, secondary_color, logo_url, status
  ) VALUES (
    p_org_id, p_name, v_final_slug, p_website, p_phone, p_email, p_city, p_primary_color, p_secondary_color, p_logo_url, 'Active'
  )
  ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    website = EXCLUDED.website,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    city = EXCLUDED.city,
    primary_color = EXCLUDED.primary_color,
    secondary_color = EXCLUDED.secondary_color,
    logo_url = EXCLUDED.logo_url
  RETURNING * INTO v_inserted_org;

  -- 3. Upsert owner user in public.users if owner_user_id is provided
  IF p_owner_user_id IS NOT NULL THEN
    INSERT INTO public.users (
      id, organization_id, role, email, name
    ) VALUES (
      p_owner_user_id, p_org_id, 'owner', p_owner_email, p_owner_name
    )
    ON CONFLICT (id) DO UPDATE SET
      organization_id = p_org_id,
      role = 'owner',
      email = p_owner_email,
      name = p_owner_name;

    -- 4. Upsert membership in public.organization_members
    INSERT INTO public.organization_members (
      user_id, organization_id, role
    ) VALUES (
      p_owner_user_id, p_org_id, 'owner'
    )
    ON CONFLICT (user_id, organization_id) DO NOTHING;
  END IF;

  -- 5. Upsert company_settings
  INSERT INTO public.company_settings (
    organization_id, branding, services, website, address, phone, email
  ) VALUES (
    p_org_id,
    jsonb_build_object(
      'name', p_name,
      'logoUrl', p_logo_url,
      'primaryColor', p_primary_color,
      'secondaryColor', p_secondary_color
    ),
    p_services,
    p_website,
    p_address,
    p_phone,
    p_email
  )
  ON CONFLICT (organization_id) DO UPDATE SET
    branding = EXCLUDED.branding,
    services = EXCLUDED.services,
    website = EXCLUDED.website,
    address = EXCLUDED.address,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email,
    updated_at = now();

  RETURN jsonb_build_object(
    'success', true,
    'org_id', v_inserted_org.id,
    'slug', v_inserted_org.slug
  );
END;
$$;
