-- STAGING-ONLY FOLLOW-UP. Apply manually after 20261013_invite_password_gate.sql.
-- Supabase invitation users already have an internal password hash. Therefore
-- activation must rely on a server-owned marker written only when that hash
-- changes during an actual password update.

begin;

create or replace function app_private.mark_invite_password_set()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if old.invited_at is not null
    and old.encrypted_password is distinct from new.encrypted_password then
    new.raw_app_meta_data := coalesce(new.raw_app_meta_data, '{}'::jsonb)
      || jsonb_build_object(
        'invite_password_set', true,
        'invite_password_set_at', clock_timestamp()
      );
  end if;
  return new;
end;
$$;

drop trigger if exists app_mark_invite_password_set on auth.users;
create trigger app_mark_invite_password_set
before update of encrypted_password on auth.users
for each row
execute function app_private.mark_invite_password_set();

create or replace function app_private.accept_invite(p_invite_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_invite public.app_invites;
  v_user_id uuid := auth.uid();
  v_email text;
  v_email_confirmed_at timestamptz;
  v_password_was_set boolean;
begin
  if v_user_id is null then
    raise exception 'authenticated user required' using errcode = '42501';
  end if;

  select
    lower(u.email),
    u.email_confirmed_at,
    coalesce((u.raw_app_meta_data ->> 'invite_password_set')::boolean, false)
  into strict v_email, v_email_confirmed_at, v_password_was_set
  from auth.users u
  where u.id = v_user_id;

  if v_email_confirmed_at is null then
    raise exception 'verified email required' using errcode = '42501';
  end if;
  if not v_password_was_set then
    raise exception 'password setup required' using errcode = '42501';
  end if;

  select * into v_invite
  from public.app_invites i
  where i.id = p_invite_id
  for update;

  if not found
    or v_invite.accepted_at is not null
    or v_invite.revoked_at is not null
    or v_invite.expires_at <= clock_timestamp()
    or lower(v_invite.email) is distinct from v_email
    or v_invite.role not in ('owner', 'employee') then
    raise exception 'invitation is invalid, expired, used, or belongs to another account'
      using errcode = '42501';
  end if;

  if not exists (
    select 1 from public.app_companies c
    where c.id = v_invite.company_id and c.active
  ) then
    raise exception 'company is not active' using errcode = '42501';
  end if;

  if v_invite.role = 'owner' and exists (
    select 1 from public.app_members m
    where m.company_id = v_invite.company_id and m.role = 'owner' and m.active
  ) then
    raise exception 'company already has an active owner' using errcode = '42501';
  end if;

  insert into public.app_members(company_id, user_id, name, email, role, active)
  values(v_invite.company_id, v_user_id, v_invite.name, v_email, v_invite.role, true)
  on conflict(company_id, user_id) do update
    set name = excluded.name,
        email = excluded.email,
        role = excluded.role,
        active = true;

  update public.app_invites
  set accepted_at = clock_timestamp(), accepted_by = v_user_id
  where id = v_invite.id;

  insert into public.app_platform_audit_events(
    actor_user_id, action, company_id, target_id, outcome, reason_code
  ) values (
    v_user_id, 'company_invite.accepted', v_invite.company_id, v_invite.id,
    'allowed', 'verified_invitation_with_password'
  );

  return jsonb_build_object(
    'companyId', v_invite.company_id,
    'userId', v_user_id,
    'role', v_invite.role
  );
end;
$$;

revoke all on function app_private.mark_invite_password_set() from public, anon, authenticated;
revoke all on function app_private.accept_invite(uuid) from public, anon, authenticated;
revoke all on function public.app_accept_invite(uuid) from public, anon, authenticated;
grant execute on function public.app_accept_invite(uuid) to authenticated;

commit;
