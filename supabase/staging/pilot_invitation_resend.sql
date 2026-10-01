-- Staging-only invitation resend contract. Not a production release.
begin;
create or replace function public.app_create_invite(p_company_id uuid,p_email text,p_name text)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_id uuid; v_email text := lower(trim(p_email));
begin
  if auth.uid() is null or public.app_role(p_company_id) is distinct from 'owner' then
    raise exception 'owner membership required' using errcode='42501';
  end if;
  if nullif(v_email,'') is null then raise exception 'email required'; end if;
  update public.app_invites set expires_at=now()-interval '1 second'
  where company_id=p_company_id and lower(email)=v_email and accepted_at is null and expires_at>now();
  insert into public.app_invites(company_id,email,name,role,expires_at)
  values(p_company_id,v_email,substr(trim(p_name),1,160),'employee',now()+interval '7 days')
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.app_create_invite(uuid,text,text) from public,anon,service_role;
grant execute on function public.app_create_invite(uuid,text,text) to authenticated;
commit;
