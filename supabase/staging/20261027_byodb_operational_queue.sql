-- STAGING-ONLY PROPOSAL. Review against a fresh metadata snapshot before applying.
-- Extends the existing BYODB queue to operational employees and projects.
-- It does not enable BYODB mode, change RLS, or touch production.
begin;

do $$
declare v_constraint name;
begin
  select conname into v_constraint from pg_catalog.pg_constraint
    where conrelid='public.app_byodb_operations'::regclass and contype='c'
      and pg_catalog.pg_get_constraintdef(oid) like '%entity_type%';
  if not found then raise exception 'BYODB_ENTITY_CONSTRAINT_MISSING'; end if;
  execute format('alter table public.app_byodb_operations drop constraint %I',v_constraint);
end $$;
alter table public.app_byodb_operations
  add constraint app_byodb_operations_entity_type_check
  check (entity_type in ('company','lead','employee_directory','project'));

create or replace function public.app_create_byodb_operation(
  p_company_id uuid,p_user_id uuid,p_user_email text,p_connector_id uuid,p_operation jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_role text; v_member_email text; v_settings public.app_company_database_settings%rowtype;
  v_connector public.app_connectors%rowtype; v_mapping public.app_connector_mappings%rowtype;
  v_existing public.app_byodb_operations%rowtype; v_operation_id uuid; v_status text;
  v_key uuid; v_version integer; v_entity text; v_action text; v_external_id text;
  v_expected text; v_payload jsonb; v_target text; v_created_at timestamptz;
begin
  select role,lower(trim(email)) into v_role,v_member_email from public.app_members
   where company_id=p_company_id and user_id=p_user_id and active for share;
  if v_role not in ('owner','employee') or v_role is null or v_member_email is distinct from lower(trim(p_user_email))
    then return jsonb_build_object('errorCode','MEMBER_ACCESS_DENIED'); end if;
  select * into v_settings from public.app_company_database_settings
   where company_id=p_company_id and mode='byodb' and write_enabled for share;
  if not found or v_settings.connector_id<>p_connector_id then return jsonb_build_object('errorCode','BYODB_WRITE_DISABLED'); end if;
  select * into v_connector from public.app_connectors
   where id=p_connector_id and company_id=p_company_id and revoked_at is null and 'operations'=any(scopes) for share;
  if not found then return jsonb_build_object('errorCode','CONNECTOR_UNAVAILABLE'); end if;
  if jsonb_typeof(p_operation)<>'object' or pg_column_size(p_operation)>12288 then return jsonb_build_object('errorCode','OPERATION_INVALID'); end if;
  begin
    v_key := (p_operation->>'idempotencyKey')::uuid;
    v_version := (p_operation->>'mappingVersion')::integer;
  exception when others then return jsonb_build_object('errorCode','OPERATION_INVALID'); end;
  v_entity := p_operation->>'entityType'; v_action := p_operation->>'action';
  v_external_id := p_operation->>'externalId'; v_expected := p_operation->>'expectedSourceVersion';
  v_payload := p_operation->'payload';
  if p_operation->>'version'<>'1' or v_version<1 or v_entity not in ('company','lead','employee_directory','project')
     or v_action not in ('create','update','delete') or v_external_id is null or length(v_external_id) not between 1 and 512
     or jsonb_typeof(v_payload)<>'object' or pg_column_size(v_payload)>8192 then
    return jsonb_build_object('errorCode','OPERATION_INVALID');
  end if;
  if (v_action='create' and v_expected is not null) or (v_action<>'create' and coalesce(v_expected !~ '^[a-f0-9]{64}$',true)) then
    return jsonb_build_object('errorCode','OPERATION_VERSION_INVALID');
  end if;
  if (v_action='delete' and v_payload<>'{}'::jsonb) or (v_action<>'delete' and v_payload='{}'::jsonb) then
    return jsonb_build_object('errorCode','OPERATION_INVALID');
  end if;
  select * into v_mapping from public.app_connector_mappings
   where connector_id=p_connector_id and company_id=p_company_id and version=v_version and approved_at is not null;
  if not found or v_mapping.definition->>'entityType'<>v_entity then return jsonb_build_object('errorCode','MAPPING_STALE'); end if;
  for v_target in select jsonb_object_keys(v_payload) loop
    if not exists(select 1 from jsonb_array_elements(v_mapping.definition->'fields') field where field->>'targetField'=v_target)
       or jsonb_typeof(v_payload->v_target) not in ('string','number','boolean','null') then
      return jsonb_build_object('errorCode','MAPPING_INVALID');
    end if;
  end loop;
  if v_role='employee' then
    if v_entity<>'lead' or v_action<>'update' or v_payload - 'status'<>'{}'::jsonb or jsonb_typeof(v_payload->'status')<>'string'
       or not exists(select 1 from jsonb_array_elements(v_mapping.definition->'fields') field where field->>'targetField'='assignedToEmail') then
      return jsonb_build_object('errorCode','MEMBER_SCOPE_DENIED');
    end if;
  end if;
  if v_action='create' and ((v_entity='company' and not (v_payload ? 'name'))
      or (v_entity='employee_directory' and (not (v_payload ? 'name') or not (v_payload ? 'email')))
      or (v_entity in ('lead','project') and not (v_payload ? 'title'))) then
    return jsonb_build_object('errorCode','OPERATION_REQUIRED_FIELD_MISSING');
  end if;
  if v_entity='project' and v_action<>'delete' then
    if (v_payload ? 'leadExternalId' and not exists (
      select 1 from public.app_connector_records r where r.company_id=p_company_id and r.connector_id=p_connector_id
        and r.entity_type='lead' and r.archived_at is null and r.external_id=v_payload->>'leadExternalId'))
      or (v_payload ? 'customerExternalId' and not exists (
      select 1 from public.app_connector_records r where r.company_id=p_company_id and r.connector_id=p_connector_id
        and r.entity_type='customer' and r.archived_at is null and r.external_id=v_payload->>'customerExternalId')) then
      return jsonb_build_object('errorCode','OPERATION_REFERENCE_NOT_FOUND');
    end if;
  end if;
  insert into public.app_byodb_operations(company_id,connector_id,actor_user_id,actor_email,actor_role,idempotency_key,mapping_version,entity_type,action,external_id,expected_source_version,payload)
  values(p_company_id,p_connector_id,p_user_id,v_member_email,v_role,v_key,v_version,v_entity,v_action,v_external_id,v_expected,v_payload)
  on conflict(company_id,idempotency_key) do nothing returning id,status,created_at into v_operation_id,v_status,v_created_at;
  if found then return jsonb_build_object('operationId',v_operation_id,'status',v_status,'createdAt',v_created_at,'replayed',false); end if;
  select * into v_existing from public.app_byodb_operations where company_id=p_company_id and idempotency_key=v_key for update;
  if not found then return jsonb_build_object('errorCode','OPERATION_RETRY'); end if;
  if v_existing.connector_id=p_connector_id and v_existing.actor_user_id=p_user_id and v_existing.mapping_version=v_version
     and v_existing.entity_type=v_entity and v_existing.action=v_action and v_existing.external_id=v_external_id
     and v_existing.expected_source_version is not distinct from v_expected and v_existing.payload=v_payload then
    return jsonb_build_object('operationId',v_existing.id,'status',v_existing.status,'createdAt',v_existing.created_at,'replayed',true);
  end if;
  return jsonb_build_object('errorCode','IDEMPOTENCY_CONFLICT');
end; $$;
revoke all on function public.app_create_byodb_operation(uuid,uuid,text,uuid,jsonb) from public,anon,authenticated;
grant execute on function public.app_create_byodb_operation(uuid,uuid,text,uuid,jsonb) to service_role;
commit;
