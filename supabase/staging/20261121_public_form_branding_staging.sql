-- Restore the current widget lookup on isolated staging for its two synthetic fixtures.
BEGIN;
DO $preflight$
BEGIN
  IF to_regprocedure('public.app_get_public_company(text)') IS NOT NULL OR
    NOT EXISTS (SELECT 1 FROM public.app_companies
      WHERE id='3a51a21e-5b13-48d1-87e9-a5915b46d37d' AND slug='e2e-synthetic-company-a' AND public_form) OR
    NOT EXISTS (SELECT 1 FROM public.app_companies
      WHERE id='b7f07d92-30b6-4894-9751-2b64e1ed4897' AND slug='e2e-synthetic-company-b' AND NOT public_form) THEN
    RAISE EXCEPTION 'Unexpected staging public form baseline';
  END IF;
END
$preflight$;

CREATE FUNCTION public.app_get_public_company(p_public_key text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
AS $function$
  SELECT jsonb_build_object('public_key',c.slug,'name',c.name,'color',c.color,
    'logo_url',c.logo_url,'active',c.active,'public_form',c.public_form)
  FROM public.app_companies c
  WHERE (c.id,c.slug) IN (
    ('3a51a21e-5b13-48d1-87e9-a5915b46d37d'::uuid,'e2e-synthetic-company-a'),
    ('b7f07d92-30b6-4894-9751-2b64e1ed4897'::uuid,'e2e-synthetic-company-b')
  )
    AND c.active AND c.public_form
    AND c.slug=lower(btrim(p_public_key))
$function$;
REVOKE ALL ON FUNCTION public.app_get_public_company(text) FROM PUBLIC, authenticated;
GRANT EXECUTE ON FUNCTION public.app_get_public_company(text) TO anon;
NOTIFY pgrst, 'reload schema';
COMMIT;
