-- STAGING-ONLY PROPOSAL. Separate approval required before application.
-- Keep new company intake disabled until the owner configures a privacy URL.
-- Preserve the reviewed function, grants, consent and queue behavior.
begin;
do $patch$
declare
  target regprocedure := to_regprocedure('public.app_platform_create_company_onboarding(uuid,text,text,text,text,text,timestamp with time zone,timestamp with time zone)');
  definition text;
  old_value text := 'values(trim(p_name),v_slug,v_email,''pilot'',true,false) returning id into v_company_id;';
  new_value text := 'values(trim(p_name),v_slug,v_email,''pilot'',false,false) returning id into v_company_id;';
begin
  if target is null then raise exception 'Reviewed onboarding function missing'; end if;
  definition := pg_get_functiondef(target);
  if position(old_value in definition) > 0 and position(new_value in definition) = 0 then
    if (length(definition) - length(replace(definition, old_value, ''))) / length(old_value) <> 1 then
      raise exception 'Unexpected onboarding insert count';
    end if;
    execute replace(definition, old_value, new_value);
  elsif position(new_value in definition) = 0 or position(old_value in definition) > 0 then
    raise exception 'Onboarding definition differs from reviewed insert';
  end if;
end;
$patch$;
commit;
