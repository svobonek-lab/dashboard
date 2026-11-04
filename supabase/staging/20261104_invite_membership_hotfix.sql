-- STAGING-ONLY PROPOSAL. Review against the deployed function before applying.
-- Repair the existing RPC without changing its body beyond the membership guard.
begin;

do $$
declare
  invite_rpc regprocedure := to_regprocedure('public.app_create_invite(uuid,text,text)');
  definition text;
  old_guard constant text := 'public.app_role(p_company_id) <> ''owner''';
  new_guard constant text := 'public.app_role(p_company_id) is distinct from ''owner''';
begin
  if invite_rpc is null then
    raise exception 'Expected the existing staging invitation RPC';
  end if;

  definition := pg_get_functiondef(invite_rpc);
  if strpos(definition, new_guard) > 0 and strpos(definition, old_guard) = 0 then
    return;
  end if;
  if strpos(definition, new_guard) > 0
    or length(definition) - length(replace(definition, old_guard, '')) <> length(old_guard) then
    raise exception 'Invitation RPC differs from the reviewed membership guard';
  end if;

  execute replace(definition, old_guard, new_guard);
end;
$$;

commit;
