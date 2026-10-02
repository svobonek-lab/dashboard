begin;
create table public.app_lead_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id),
  lead_id uuid not null references public.app_leads(id) on delete cascade,
  actor_id uuid,
  operation text not null,
  old_status text,
  new_status text not null,
  old_assigned_to uuid,
  new_assigned_to uuid,
  old_value numeric,
  new_value numeric,
  created_at timestamptz not null default clock_timestamp()
);
alter table public.app_lead_events enable row level security;
revoke all on public.app_lead_events from public,anon,authenticated;
grant select on public.app_lead_events to authenticated;
create policy app_lead_events_read on public.app_lead_events for select to authenticated
using (public.app_role(company_id)='owner' or public.app_can_lead(company_id,lead_id));
create function app_private.record_lead_event() returns trigger
language plpgsql security definer set search_path=public,pg_temp as $$
begin
  insert into public.app_lead_events(company_id,lead_id,actor_id,operation,old_status,new_status,old_assigned_to,new_assigned_to,old_value,new_value)
  values(new.company_id,new.id,auth.uid(),TG_OP,
    case when TG_OP='UPDATE' then old.status end,new.status,
    case when TG_OP='UPDATE' then old.assigned_to end,new.assigned_to,
    case when TG_OP='UPDATE' then old.value end,new.value);
  return new;
end $$;
revoke all on function app_private.record_lead_event() from public,anon,authenticated;
create trigger app_leads_record_event after insert or update on public.app_leads
for each row execute function app_private.record_lead_event();

create or replace function public.app_rollback_import(p_company_id uuid,p_fingerprint text)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_import public.app_imports; v_deleted integer; v_count integer;
begin
  select * into v_import from public.app_imports where company_id=p_company_id and fingerprint=p_fingerprint for update;
  if not found then raise exception 'import not found'; end if;
  if v_import.status='rolled_back' then
    return jsonb_build_object('importId',v_import.id,'deleted',0,'status','rolled_back');
  end if;
  if v_import.status <> 'completed' then raise exception 'import is not completed'; end if;
  perform id from public.app_leads where company_id=p_company_id and import_fingerprint=p_fingerprint for update;
  select count(*) into v_count from public.app_leads where company_id=p_company_id and import_fingerprint=p_fingerprint;
  if exists(select 1 from public.app_leads where company_id=p_company_id and import_fingerprint=p_fingerprint and revision<>1)
    or coalesce((v_import.summary->>'updated')::integer,0)<>0
    or v_count<>coalesce((v_import.summary->>'created')::integer,0) then
    raise exception 'import records changed; rollback refused';
  end if;
  delete from public.app_leads where company_id=p_company_id and import_fingerprint=p_fingerprint;
  get diagnostics v_deleted=row_count;
  update public.app_imports set status='rolled_back',rolled_back_at=clock_timestamp() where id=v_import.id;
  return jsonb_build_object('importId',v_import.id,'deleted',v_deleted,'status','rolled_back');
end $$;
revoke all on function public.app_rollback_import(uuid,text) from public,anon,authenticated;
grant execute on function public.app_rollback_import(uuid,text) to service_role;
commit;
