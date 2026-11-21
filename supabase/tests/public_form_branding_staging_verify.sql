\set ON_ERROR_STOP on
SET ROLE anon;
DO $test$
DECLARE branding jsonb;
BEGIN
  branding := public.app_get_public_company('e2e-synthetic-company-a');
  IF branding IS DISTINCT FROM '{"public_key":"e2e-synthetic-company-a","name":"Test company A","color":"#123456","logo_url":"","active":true,"public_form":true}'::jsonb THEN
    RAISE EXCEPTION 'Unexpected or non-public branding fields';
  END IF;
  IF public.app_get_public_company('e2e-synthetic-company-b') IS NOT NULL
     OR public.app_get_public_company('another-fixture') IS NOT NULL
     OR public.app_get_public_company('not-found') IS NOT NULL THEN
    RAISE EXCEPTION 'Unavailable tenant branding became visible';
  END IF;
  IF has_table_privilege('anon','public.app_companies','SELECT')
    OR has_function_privilege('authenticated','public.app_get_public_company(text)','EXECUTE') THEN
    RAISE EXCEPTION 'Unexpected direct table or authenticated function grant';
  END IF;
END
$test$;
RESET ROLE;
