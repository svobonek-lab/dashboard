-- Isolated staging authorization repair. Not a production release.
begin;
create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;
create or replace function public.app_create_invite(p_company_id uuid,p_email text,p_name text)
returns uuid language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_id uuid;
begin
  if auth.uid() is null or public.app_role(p_company_id) is distinct from 'owner' then
    raise exception 'owner membership required' using errcode='42501';
  end if;
  if nullif(trim(p_email),'') is null then raise exception 'email required'; end if;
  insert into public.app_invites(company_id,email,name,role,expires_at)
  values(p_company_id,lower(trim(p_email)),substr(trim(p_name),1,160),'employee',now()+interval '7 days')
  returning id into v_id;
  return v_id;
end $$;
revoke all on function public.app_create_invite(uuid,text,text) from public,anon,service_role;
grant execute on function public.app_create_invite(uuid,text,text) to authenticated;

create or replace function app_private.guard_lead_mutation()
returns trigger language plpgsql security invoker set search_path=public,pg_temp as $$
declare v_role text;
begin
  if TG_OP='UPDATE' then
    if new.id is distinct from old.id or new.company_id is distinct from old.company_id then
      raise exception 'lead identity is immutable' using errcode='42501';
    end if;
  end if;
  if current_user='authenticated' then
    v_role := public.app_role(new.company_id);
    if auth.uid() is null or v_role is null or not exists(
      select 1 from public.app_companies where id=new.company_id and active
    ) then raise exception 'active company membership required' using errcode='42501'; end if;
    if TG_OP='INSERT' and v_role <> 'owner' then
      raise exception 'only owner can create leads' using errcode='42501';
    end if;
    if TG_OP='UPDATE' then
      if new.created_at is distinct from old.created_at
        or new.import_fingerprint is distinct from old.import_fingerprint
        or new.source_record_id is distinct from old.source_record_id
        or new.revision is distinct from old.revision then
        raise exception 'server-managed fields are immutable' using errcode='42501';
      end if;
      if v_role='employee' then
        if old.assigned_to is distinct from auth.uid()
          or (to_jsonb(new)-'status') is distinct from (to_jsonb(old)-'status') then
          raise exception 'employee may only update assigned lead status' using errcode='42501';
        end if;
        if new.status is distinct from old.status and not (
          (old.status='new' and new.status in ('contacted','lost')) or
          (old.status='contacted' and new.status in ('scheduled','in_progress','lost')) or
          (old.status='scheduled' and new.status in ('in_progress','lost')) or
          (old.status='in_progress' and new.status in ('won','lost'))
        ) then raise exception 'invalid employee status transition' using errcode='42501'; end if;
      elsif v_role <> 'owner' then
        raise exception 'unsupported role' using errcode='42501';
      end if;
    end if;
    if new.status not in ('new','contacted','scheduled','in_progress','won','lost') then
      raise exception 'invalid lead status' using errcode='22023';
    end if;
  end if;
  if new.assigned_to is not null and (TG_OP='INSERT' or new.assigned_to is distinct from old.assigned_to)
    and not exists(select 1 from public.app_members where company_id=new.company_id and user_id=new.assigned_to and active) then
    raise exception 'assignee must be an active member of this company' using errcode='42501';
  end if;
  if TG_OP='UPDATE' then
    new.revision := old.revision+1;
    new.updated_at := clock_timestamp();
  end if;
  return new;
end $$;
revoke all on function app_private.guard_lead_mutation() from public,anon,authenticated;
drop trigger if exists app_leads_guard_mutation on public.app_leads;
create trigger app_leads_guard_mutation before insert or update on public.app_leads
for each row execute function app_private.guard_lead_mutation();
drop policy if exists app_leads_update_scoped on public.app_leads;
create policy app_leads_update_scoped on public.app_leads for update to authenticated
using (public.app_role(company_id)='owner' or public.app_can_lead(company_id,id))
with check (public.app_role(company_id)='owner' or public.app_can_lead(company_id,id));
commit;
