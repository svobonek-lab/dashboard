-- Isolated staging invitation acceptance. Not a production release.
begin;
alter table public.app_invites add column if not exists accepted_at timestamptz;
alter table public.app_invites add column if not exists accepted_by uuid;

create or replace function app_private.accept_invite(p_invite_id uuid)
returns jsonb language plpgsql security definer set search_path=public,auth,pg_temp as $$
declare
  v_invite public.app_invites;
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode='42501';
  end if;
  select lower(email), email_confirmed_at into strict v_email, v_email_confirmed_at
  from auth.users where id=v_user_id;
  if v_email_confirmed_at is null then
    raise exception 'verified email required' using errcode='42501';
  end if;

  select * into v_invite from public.app_invites where id=p_invite_id for update;
  if not found or v_invite.accepted_at is not null or v_invite.expires_at<=now()
    or lower(v_invite.email) is distinct from v_email then
    raise exception 'invitation is invalid, expired, used, or belongs to another account' using errcode='42501';
  end if;
  if not exists(select 1 from public.app_companies where id=v_invite.company_id and active) then
    raise exception 'company is not active' using errcode='42501';
  end if;

  insert into public.app_members(company_id,user_id,name,email,role,active)
  values(v_invite.company_id,v_user_id,v_invite.name,v_email,'employee',true)
  on conflict(company_id,user_id) do update
    set name=excluded.name,email=excluded.email,active=true
    where app_members.role='employee';

  update public.app_invites
  set accepted_at=clock_timestamp(),accepted_by=v_user_id
  where id=v_invite.id;

  return jsonb_build_object('companyId',v_invite.company_id,'userId',v_user_id,'role','employee');
end $$;
revoke all on function app_private.accept_invite(uuid) from public,anon;
grant usage on schema app_private to authenticated;
grant execute on function app_private.accept_invite(uuid) to authenticated;

create or replace function public.app_accept_invite(p_invite_id uuid)
returns jsonb language sql security invoker set search_path=public,app_private,pg_temp as $$
  select app_private.accept_invite(p_invite_id)
$$;
revoke all on function public.app_accept_invite(uuid) from public,anon;
grant execute on function public.app_accept_invite(uuid) to authenticated;

create or replace function app_private.guard_invite_acceptance()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
begin
  if current_user='authenticated' and
     (new.accepted_at is distinct from old.accepted_at or new.accepted_by is distinct from old.accepted_by) then
    raise exception 'acceptance fields are server managed' using errcode='42501';
  end if;
  return new;
end $$;
revoke all on function app_private.guard_invite_acceptance() from public,anon,authenticated;
drop trigger if exists app_invites_guard_acceptance on public.app_invites;
create trigger app_invites_guard_acceptance before update on public.app_invites
for each row execute function app_private.guard_invite_acceptance();
commit;
