-- STAGING-ONLY PROPOSAL. Review metadata and test in a disposable database first.
-- Extends the existing tenant-scoped projection RPC. Does not enable BYODB writes.
begin;

create or replace function public.app_list_byodb_records(p_company_id uuid,p_user_id uuid,p_entity_type text default 'lead')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_role text;
  v_email text;
  v_connector_id uuid;
  v_result jsonb;
begin
  select role,lower(trim(email)) into v_role,v_email
    from public.app_members
    where company_id=p_company_id and user_id=p_user_id and active for share;
  if v_role not in ('owner','employee') or v_role is null
     or p_entity_type not in ('company','lead','employee_directory','project','lead_note','lead_file')
     or (v_role='employee' and p_entity_type in ('company','employee_directory')) then
    return '[]'::jsonb;
  end if;

  select connector_id into v_connector_id from public.app_company_database_settings
    where company_id=p_company_id and mode='byodb';
  if v_connector_id is null then return '[]'::jsonb; end if;

  select coalesce(jsonb_agg(jsonb_build_object(
    'externalId',record.external_id,'fingerprint',record.fingerprint,
    'payload',case when p_entity_type='lead_file' then record.payload - 'objectPath' else record.payload end)
    order by record.updated_at desc,record.external_id),'[]'::jsonb)
    into v_result
    from public.app_connector_records record
    where record.company_id=p_company_id and record.connector_id=v_connector_id
      and record.entity_type=p_entity_type and record.archived_at is null
      and (v_role='owner'
        or (p_entity_type='lead' and lower(coalesce(record.payload->>'assignedToEmail',''))=v_email)
        or (p_entity_type in ('project','lead_note','lead_file')
          and record.payload->>'leadExternalId' is not null
          and exists (
            select 1 from public.app_connector_records lead_record
            where lead_record.company_id=p_company_id and lead_record.connector_id=v_connector_id
              and lead_record.entity_type='lead' and lead_record.archived_at is null
              and lead_record.external_id=record.payload->>'leadExternalId'
              and lower(coalesce(lead_record.payload->>'assignedToEmail',''))=v_email
          )));
  return v_result;
end; $$;

revoke all on function public.app_list_byodb_records(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.app_list_byodb_records(uuid,uuid,text) to service_role;
commit;
