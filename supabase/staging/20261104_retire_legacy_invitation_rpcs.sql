-- STAGING-ONLY PROPOSAL. Apply after the modern invitation flow is verified.
-- Keep the old functions for review, but close browser access to the legacy paths.
begin;

do $$
declare
  signature text;
  rpc regprocedure;
begin
  foreach signature in array array[
    'public.app_create_invite(uuid,text,text)',
    'public.app_accept_invite(uuid)',
    'public.app_record_owner_legal_consent(uuid,timestamptz)'
  ] loop
    rpc := to_regprocedure(signature);
    if rpc is null
      or not has_function_privilege('authenticated', rpc, 'EXECUTE')
      or has_function_privilege('anon', rpc, 'EXECUTE') then
      raise exception 'Modern invitation RPC is missing or has unexpected grants: %', signature;
    end if;
  end loop;

  if to_regclass('public.app_company_legal_acceptances') is null
    or not exists (
      select 1 from pg_trigger
      where tgrelid = 'auth.users'::regclass
        and tgname = 'app_mark_invite_password_set'
        and tgenabled in ('O', 'A')
        and not tgisinternal
    ) then
    raise exception 'Invitation password proof or legal consent is not installed';
  end if;

  foreach signature in array array[
    'public.app_claim_invites()',
    'public.app_invite(uuid,text,text)'
  ] loop
    rpc := to_regprocedure(signature);
    if rpc is null then
      continue;
    end if;

    execute format('revoke execute on function %s from public, anon, authenticated', signature);
    if has_function_privilege('authenticated', rpc, 'EXECUTE')
      or has_function_privilege('anon', rpc, 'EXECUTE') then
      raise exception 'Legacy invitation RPC is still reachable through an inherited grant: %', signature;
    end if;
  end loop;
end;
$$;

commit;
