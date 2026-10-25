-- STAGING-ONLY PROPOSAL — DO NOT APPLY TO PRODUCTION.
-- Durable source-of-truth operations for an outbound BYODB connector.
begin;

create table if not exists public.app_company_database_settings (
  company_id uuid primary key references public.app_companies(id) on delete cascade,
  mode text not null default 'managed_cloud' check (mode in ('managed_cloud','byodb')),
  driver text check (driver is null or driver in ('postgres','mysql','mariadb','mssql')),
  connector_id uuid,
  write_enabled boolean not null default false,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  check ((mode='managed_cloud' and driver is null and connector_id is null and not write_enabled)
      or (mode='byodb' and driver is not null and connector_id is not null))
);

create table if not exists public.app_byodb_operations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  connector_id uuid not null,
  actor_user_id uuid not null,
  actor_email text not null,
  actor_role text not null check (actor_role in ('owner','employee')),
  idempotency_key uuid not null,
  mapping_version integer not null check (mapping_version > 0),
  entity_type text not null check (entity_type in ('company','lead')),
  action text not null check (action in ('create','update','delete')),
  external_id text not null check (length(external_id) between 1 and 512),
  expected_source_version text check (expected_source_version is null or expected_source_version ~ '^[a-f0-9]{64}$'),
  payload jsonb not null check (jsonb_typeof(payload)='object' and pg_column_size(payload)<=8192),
  status text not null default 'pending' check (status in ('pending','processing','applied','conflict','failed')),
  source_version text check (source_version is null or source_version ~ '^[a-f0-9]{64}$'),
  error_code text check (error_code is null or error_code in ('SOURCE_CONFLICT','SOURCE_WRITE_REJECTED','MAPPING_STALE','SOURCE_UNAVAILABLE')),
  attempts integer not null default 0 check (attempts>=0),
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id,idempotency_key),
  foreign key (company_id,connector_id) references public.app_connectors(company_id,id)
);

create or replace function public.app_block_cloud_lead_writes_for_byodb()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if exists(select 1 from public.app_company_database_settings where company_id=coalesce(new.company_id,old.company_id) and mode='byodb') then
    raise exception using errcode='55000',message='BYODB_SOURCE_OF_TRUTH';
  end if;
  if tg_op='DELETE' then return old; end if;
  return new;
end; $$;
drop trigger if exists app_block_cloud_lead_writes_for_byodb on public.app_leads;
create trigger app_block_cloud_lead_writes_for_byodb before insert or update or delete on public.app_leads
  for each row execute function public.app_block_cloud_lead_writes_for_byodb();
create or replace function public.app_block_cloud_company_writes_for_byodb()
returns trigger language plpgsql security definer set search_path=public,pg_temp as $$
begin
  if exists(select 1 from public.app_company_database_settings where company_id=old.id and mode='byodb') then
    raise exception using errcode='55000',message='BYODB_SOURCE_OF_TRUTH';
  end if;
  return new;
end; $$;
drop trigger if exists app_block_cloud_company_writes_for_byodb on public.app_companies;
create trigger app_block_cloud_company_writes_for_byodb before update of name,email,phone,address on public.app_companies
  for each row execute function public.app_block_cloud_company_writes_for_byodb();
create index if not exists app_byodb_operations_poll_idx
  on public.app_byodb_operations(connector_id,status,created_at,id);
create index if not exists app_byodb_operations_tenant_idx
  on public.app_byodb_operations(company_id,created_at desc,id desc);

alter table public.app_company_database_settings enable row level security;
alter table public.app_byodb_operations enable row level security;
revoke all on public.app_company_database_settings from anon,authenticated;
revoke all on public.app_byodb_operations from anon,authenticated;
grant all on public.app_company_database_settings to service_role;
grant all on public.app_byodb_operations to service_role;

create or replace function public.app_create_byodb_operation(
  p_company_id uuid,p_user_id uuid,p_user_email text,p_connector_id uuid,p_operation jsonb
) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare
  v_role text; v_settings public.app_company_database_settings%rowtype;
  v_connector public.app_connectors%rowtype; v_mapping public.app_connector_mappings%rowtype;
  v_existing public.app_byodb_operations%rowtype; v_operation_id uuid; v_status text;
  v_key uuid; v_version integer; v_entity text; v_action text; v_external_id text;
  v_expected text; v_payload jsonb; v_target text; v_created_at timestamptz;
begin
  select role into v_role from public.app_members
   where company_id=p_company_id and user_id=p_user_id and active for share;
  if v_role not in ('owner','employee') or v_role is null then return jsonb_build_object('errorCode','MEMBER_ACCESS_DENIED'); end if;
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
  if p_operation->>'version'<>'1' or v_version<1 or v_entity not in ('company','lead') or v_action not in ('create','update','delete')
     or v_external_id is null or length(v_external_id) not between 1 and 512 or jsonb_typeof(v_payload)<>'object' or pg_column_size(v_payload)>8192 then
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
    if not exists(select 1 from jsonb_array_elements(v_mapping.definition->'fields') field where field->>'targetField'=v_target) then
      return jsonb_build_object('errorCode','MAPPING_INVALID');
    end if;
  end loop;
  if v_role='employee' then
    if v_entity<>'lead' or v_action<>'update' or v_payload - 'status'<>'{}'::jsonb or jsonb_typeof(v_payload->'status')<>'string'
       or not exists(select 1 from jsonb_array_elements(v_mapping.definition->'fields') field where field->>'targetField'='assignedToEmail') then
      return jsonb_build_object('errorCode','MEMBER_SCOPE_DENIED');
    end if;
  end if;
  if v_action='create' and not (v_payload ? case when v_entity='company' then 'name' else 'title' end) then
    return jsonb_build_object('errorCode','OPERATION_REQUIRED_FIELD_MISSING');
  end if;
  insert into public.app_byodb_operations(company_id,connector_id,actor_user_id,actor_email,actor_role,idempotency_key,mapping_version,entity_type,action,external_id,expected_source_version,payload)
  values(p_company_id,p_connector_id,p_user_id,lower(trim(p_user_email)),v_role,v_key,v_version,v_entity,v_action,v_external_id,v_expected,v_payload)
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

create or replace function public.app_list_byodb_operations(p_company_id uuid,p_user_id uuid,p_limit integer default 25,p_cursor uuid default null)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text; v_before timestamptz; v_result jsonb;
begin
  select role into v_role from public.app_members where company_id=p_company_id and user_id=p_user_id and active for share;
  if v_role not in ('owner','employee') or v_role is null then return '[]'::jsonb; end if;
  if p_limit<1 or p_limit>50 then return '[]'::jsonb; end if;
  if p_cursor is not null then
    select created_at into v_before from public.app_byodb_operations where company_id=p_company_id and id=p_cursor;
    if v_before is null then return '[]'::jsonb; end if;
  end if;
  select coalesce(jsonb_agg(jsonb_build_object('operationId',id,'status',status,'entityType',entity_type,'action',action,
    'createdAt',created_at,'updatedAt',updated_at,'errorCode',error_code) order by created_at desc,id desc),'[]'::jsonb)
    into v_result from (select * from public.app_byodb_operations where company_id=p_company_id
      and (v_before is null or created_at<v_before or (created_at=v_before and id<p_cursor)) order by created_at desc,id desc limit p_limit) page;
  return v_result;
end; $$;
revoke all on function public.app_list_byodb_operations(uuid,uuid,integer,uuid) from public,anon,authenticated;
grant execute on function public.app_list_byodb_operations(uuid,uuid,integer,uuid) to service_role;

create or replace function public.app_poll_byodb_operations(p_connector_id uuid,p_limit integer default 25)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_company_id uuid; v_enabled boolean; v_result jsonb;
begin
  select company_id into v_company_id from public.app_connectors where id=p_connector_id and revoked_at is null and 'operations'=any(scopes);
  if v_company_id is null or p_limit<1 or p_limit>50 then return '[]'::jsonb; end if;
  select write_enabled into v_enabled from public.app_company_database_settings where company_id=v_company_id and connector_id=p_connector_id and mode='byodb';
  if not coalesce(v_enabled,false) then return '[]'::jsonb; end if;
  update public.app_byodb_operations o set status='failed',error_code='MAPPING_STALE',updated_at=now()
    where o.connector_id=p_connector_id and o.status='pending'
      and not exists(select 1 from public.app_connector_mappings m where m.company_id=o.company_id and m.connector_id=o.connector_id
        and m.version=o.mapping_version and m.approved_at is not null and m.definition->>'entityType'=o.entity_type);
  update public.app_byodb_operations set status='pending',lease_expires_at=null,updated_at=now()
    where connector_id=p_connector_id and status='processing' and (lease_expires_at is null or lease_expires_at<=now());
  with candidates as (
    select id from public.app_byodb_operations o where connector_id=p_connector_id and status='pending'
      and exists(select 1 from public.app_connector_mappings m where m.company_id=o.company_id and m.connector_id=o.connector_id
        and m.version=o.mapping_version and m.approved_at is not null and m.definition->>'entityType'=o.entity_type)
    order by created_at,id for update skip locked limit p_limit
  ), claimed as (
    update public.app_byodb_operations o set status='processing',attempts=o.attempts+1,lease_expires_at=now()+interval '5 minutes',updated_at=now()
    from candidates c where o.id=c.id returning o.*
  )
  select coalesce(jsonb_agg(jsonb_build_object('operationId',c.id,'idempotencyKey',c.idempotency_key,'mappingVersion',c.mapping_version,
    'entityType',c.entity_type,'action',c.action,'externalId',c.external_id,'expectedSourceVersion',c.expected_source_version,
    'payload',c.payload,'actorRole',c.actor_role,'actorEmail',c.actor_email,'mappingDefinition',m.definition) order by c.created_at,c.id),'[]'::jsonb)
    into v_result from claimed c join public.app_connector_mappings m on m.company_id=c.company_id and m.connector_id=c.connector_id
      and m.version=c.mapping_version and m.approved_at is not null and m.definition->>'entityType'=c.entity_type;
  return v_result;
end; $$;
revoke all on function public.app_poll_byodb_operations(uuid,integer) from public,anon,authenticated;
grant execute on function public.app_poll_byodb_operations(uuid,integer) to service_role;

drop function if exists public.app_ack_byodb_operation(uuid,uuid,text,text,text);
create or replace function public.app_ack_byodb_operation(
  p_connector_id uuid,p_operation_id uuid,p_status text,p_source_version text default null,p_error_code text default null,p_projection jsonb default null
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_company_id uuid; v_operation public.app_byodb_operations%rowtype; v_mapping public.app_connector_mappings%rowtype; v_key text;
begin
  select company_id into v_company_id from public.app_connectors where id=p_connector_id and revoked_at is null and 'operations'=any(scopes);
  if v_company_id is null then return false; end if;
  if p_status is null or p_status not in ('applied','conflict','failed') or
     (p_status='applied' and (p_source_version is null or p_source_version !~ '^[a-f0-9]{64}$' or p_error_code is not null)) or
     (p_status='conflict' and p_error_code is distinct from 'SOURCE_CONFLICT') or
     (p_status='failed' and (p_error_code is null or p_error_code not in ('SOURCE_WRITE_REJECTED','MAPPING_STALE','SOURCE_UNAVAILABLE') or p_source_version is not null)) or
     (p_status<>'applied' and p_projection is not null) then return false; end if;
  select * into v_operation from public.app_byodb_operations where id=p_operation_id and connector_id=p_connector_id and company_id=v_company_id for update;
  if not found then return false; end if;
  if v_operation.status in ('applied','conflict','failed') then
    if v_operation.status<>p_status or v_operation.source_version is distinct from p_source_version or v_operation.error_code is distinct from p_error_code then return false; end if;
    if p_status<>'applied' then return true; end if;
    if v_operation.action='delete' then return exists(select 1 from public.app_connector_records where company_id=v_company_id and connector_id=p_connector_id and entity_type=v_operation.entity_type and external_id=v_operation.external_id and archived_at is not null); end if;
    return p_projection is not null and exists(select 1 from public.app_connector_records where company_id=v_company_id and connector_id=p_connector_id and entity_type=v_operation.entity_type and external_id=v_operation.external_id and fingerprint=p_projection->>'fingerprint');
  end if;
  if v_operation.status<>'processing' then return false; end if;
  if p_status='applied' then
    if v_operation.action='delete' then
      if p_projection is not null then return false; end if;
      update public.app_connector_records set archived_at=now(),updated_at=now() where company_id=v_company_id and connector_id=p_connector_id and entity_type=v_operation.entity_type and external_id=v_operation.external_id;
      if not found then return false; end if;
    else
      if p_projection is null or jsonb_typeof(p_projection)<>'object' or p_projection->>'version'<>'1'
        or p_projection->>'type'<>v_operation.entity_type or p_projection->>'externalId'<>v_operation.external_id
        or p_projection->>'fingerprint'<>p_source_version or p_projection->>'sourceTable' is null
        or jsonb_typeof(p_projection->'payload')<>'object'
        or exists(select 1 from jsonb_object_keys(p_projection) key where key not in ('version','type','sourceSystem','sourceTable','externalId','sourceUpdatedAt','fingerprint','payload')) then return false; end if;
      select * into v_mapping from public.app_connector_mappings where company_id=v_company_id and connector_id=p_connector_id and version=v_operation.mapping_version and approved_at is not null;
      if not found or p_projection->>'sourceSystem' is distinct from v_mapping.definition->>'sourceSystem'
        or p_projection->>'sourceTable' is distinct from concat(v_mapping.definition->>'schema','.',v_mapping.definition->>'table') then return false; end if;
      for v_key in select jsonb_object_keys(p_projection->'payload') loop
        if not exists(select 1 from jsonb_array_elements(v_mapping.definition->'fields') field where field->>'targetField'=v_key)
          or jsonb_typeof(p_projection->'payload'->v_key) not in ('string','number','boolean','null') then return false; end if;
      end loop;
      insert into public.app_connector_records(company_id,connector_id,mapping_version,entity_type,external_id,fingerprint,payload,source_updated_at,archived_at)
      values(v_company_id,p_connector_id,v_operation.mapping_version,v_operation.entity_type,v_operation.external_id,p_source_version,p_projection->'payload',nullif(p_projection->>'sourceUpdatedAt','')::timestamptz,
        case when coalesce((p_projection->'payload'->>'archived')::boolean,false) then now() else null end)
      on conflict(company_id,connector_id,entity_type,external_id) do update set mapping_version=excluded.mapping_version,fingerprint=excluded.fingerprint,payload=excluded.payload,source_updated_at=excluded.source_updated_at,archived_at=excluded.archived_at,updated_at=now();
    end if;
  end if;
  update public.app_byodb_operations set status=p_status,source_version=p_source_version,error_code=p_error_code,lease_expires_at=null,updated_at=now()
    where id=p_operation_id and connector_id=p_connector_id and company_id=v_company_id;
  return found;
end; $$;
revoke all on function public.app_ack_byodb_operation(uuid,uuid,text,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.app_ack_byodb_operation(uuid,uuid,text,text,text,jsonb) to service_role;

create or replace function public.app_get_byodb_context(p_company_id uuid,p_user_id uuid)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text; v_settings public.app_company_database_settings%rowtype; v_connector public.app_connectors%rowtype;
  v_mapping public.app_connector_mappings%rowtype; v_company_mapping public.app_connector_mappings%rowtype;
  v_targets jsonb := '[]'::jsonb; v_company_targets jsonb := '[]'::jsonb;
begin
  select role into v_role from public.app_members where company_id=p_company_id and user_id=p_user_id and active for share;
  if v_role not in ('owner','employee') or v_role is null then return jsonb_build_object('errorCode','MEMBER_ACCESS_DENIED'); end if;
  select * into v_settings from public.app_company_database_settings where company_id=p_company_id;
  if not found or v_settings.mode<>'byodb' then
    return jsonb_build_object('mode','managed_cloud','driver',null,'connectorId',null,'mappingVersion',null,'mappedTargets','[]'::jsonb,
      'companyMappingVersion',null,'companyMappedTargets','[]'::jsonb,'writeEnabled',false,'connectorStatus',null);
  end if;
  select * into v_connector from public.app_connectors where id=v_settings.connector_id and company_id=p_company_id and revoked_at is null;
  select * into v_mapping from public.app_connector_mappings where company_id=p_company_id and connector_id=v_settings.connector_id and approved_at is not null and definition->>'entityType'='lead' order by version desc limit 1;
  if found then
    select coalesce(jsonb_agg(field->>'targetField' order by field->>'targetField'),'[]'::jsonb) into v_targets
      from jsonb_array_elements(v_mapping.definition->'fields') field;
  end if;
  select * into v_company_mapping from public.app_connector_mappings where company_id=p_company_id and connector_id=v_settings.connector_id
    and approved_at is not null and definition->>'entityType'='company' order by version desc limit 1;
  if found then
    select coalesce(jsonb_agg(field->>'targetField' order by field->>'targetField'),'[]'::jsonb) into v_company_targets
      from jsonb_array_elements(v_company_mapping.definition->'fields') field;
  end if;
  return jsonb_build_object('mode','byodb','driver',v_settings.driver,'connectorId',v_settings.connector_id,
    'mappingVersion',case when v_mapping.version>0 then v_mapping.version else null end,'mappedTargets',v_targets,
    'companyMappingVersion',case when v_company_mapping.version>0 then v_company_mapping.version else null end,'companyMappedTargets',v_company_targets,
    'writeEnabled',v_settings.write_enabled and v_connector.id is not null and v_mapping.version>0 and v_company_mapping.version>0
      and (select count(*) from public.app_connector_records where company_id=p_company_id and connector_id=v_settings.connector_id and entity_type='company' and archived_at is null)=1,
    'connectorStatus',case when v_connector.id is null then 'revoked' else v_connector.status end);
end; $$;
revoke all on function public.app_get_byodb_context(uuid,uuid) from public,anon,authenticated;
grant execute on function public.app_get_byodb_context(uuid,uuid) to service_role;

drop function if exists public.app_list_byodb_records(uuid,uuid);
create or replace function public.app_list_byodb_records(p_company_id uuid,p_user_id uuid,p_entity_type text default 'lead')
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text; v_email text; v_settings public.app_company_database_settings%rowtype; v_result jsonb;
begin
  select role,lower(trim(email)) into v_role,v_email from public.app_members where company_id=p_company_id and user_id=p_user_id and active for share;
  if v_role not in ('owner','employee') or v_role is null or p_entity_type not in ('company','lead') or (v_role='employee' and p_entity_type<>'lead') then return '[]'::jsonb; end if;
  select * into v_settings from public.app_company_database_settings where company_id=p_company_id and mode='byodb';
  if not found or v_settings.connector_id is null then return '[]'::jsonb; end if;
  select coalesce(jsonb_agg(jsonb_build_object('externalId',external_id,'fingerprint',fingerprint,'payload',payload) order by updated_at desc,external_id),'[]'::jsonb)
    into v_result from public.app_connector_records
    where company_id=p_company_id and connector_id=v_settings.connector_id and entity_type=p_entity_type and archived_at is null
      and (v_role='owner' or lower(coalesce(payload->>'assignedToEmail',''))=coalesce(v_email,''));
  return v_result;
end; $$;
revoke all on function public.app_list_byodb_records(uuid,uuid,text) from public,anon,authenticated;
grant execute on function public.app_list_byodb_records(uuid,uuid,text) to service_role;

create or replace function public.app_set_company_database_mode(
  p_company_id uuid,p_user_id uuid,p_connector_id uuid,p_mode text,p_driver text,p_write_enabled boolean
) returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
declare v_role text; v_connector public.app_connectors%rowtype; v_mapping public.app_connector_mappings%rowtype;
  v_company_mapping public.app_connector_mappings%rowtype;
begin
  select role into v_role from public.app_members where company_id=p_company_id and user_id=p_user_id and active for share;
  if v_role<>'owner' or v_role is null then return false; end if;
  if p_mode='managed_cloud' then
    if exists(select 1 from public.app_byodb_operations where company_id=p_company_id and status in ('pending','processing')) then return false; end if;
    insert into public.app_company_database_settings(company_id,mode,driver,connector_id,write_enabled,updated_by,updated_at)
      values(p_company_id,'managed_cloud',null,null,false,p_user_id,now())
      on conflict(company_id) do update set mode='managed_cloud',driver=null,connector_id=null,write_enabled=false,updated_by=excluded.updated_by,updated_at=now();
    return true;
  end if;
  if p_mode<>'byodb' or p_driver not in ('postgres','mysql','mariadb','mssql') or p_connector_id is null then return false; end if;
  select * into v_connector from public.app_connectors where id=p_connector_id and company_id=p_company_id and revoked_at is null for share;
  if not found then return false; end if;
  select * into v_mapping from public.app_connector_mappings where company_id=p_company_id and connector_id=p_connector_id
    and approved_at is not null and definition->>'entityType'='lead' order by version desc limit 1;
  if not found then return false; end if;
  if p_write_enabled and not exists(select 1 from jsonb_array_elements(v_mapping.definition->'fields') f where f->>'targetField'='assignedToEmail') then return false; end if;
  select * into v_company_mapping from public.app_connector_mappings where company_id=p_company_id and connector_id=p_connector_id
    and approved_at is not null and definition->>'entityType'='company' order by version desc limit 1;
  if not found or not exists(select 1 from jsonb_array_elements(v_company_mapping.definition->'fields') f where f->>'targetField'='name') then return false; end if;
  if (select count(*) from public.app_connector_records where company_id=p_company_id and connector_id=p_connector_id and entity_type='company' and archived_at is null)<>1 then return false; end if;
  insert into public.app_company_database_settings(company_id,mode,driver,connector_id,write_enabled,updated_by,updated_at)
    values(p_company_id,'byodb',p_driver,p_connector_id,p_write_enabled,p_user_id,now())
    on conflict(company_id) do update set mode='byodb',driver=excluded.driver,connector_id=excluded.connector_id,write_enabled=excluded.write_enabled,updated_by=excluded.updated_by,updated_at=now();
  return true;
end; $$;
revoke all on function public.app_set_company_database_mode(uuid,uuid,uuid,text,text,boolean) from public,anon,authenticated;
grant execute on function public.app_set_company_database_mode(uuid,uuid,uuid,text,text,boolean) to service_role;

create or replace function public.app_owner_connector_status(p_company_id uuid, p_user_id uuid)
returns jsonb language sql security definer set search_path=public,pg_temp as $$
  select case when exists(select 1 from public.app_members where company_id=p_company_id and user_id=p_user_id and active and role='owner') then
    coalesce((select jsonb_agg(jsonb_build_object(
      'id',c.id,'status',case when c.revoked_at is not null then 'revoked' else c.status end,'version',c.version,
      'lastHeartbeatAt',c.last_heartbeat_at,'nextSyncAt',c.next_sync_at,'sourceSchema',c.source_schema,'lastRun',c.last_run,'pauseReason',c.pause_reason,
      'mappingVersion',latest.version,'approvedMappingVersion',case when latest.approved_at is not null then latest.version else null end,
      'dryRun',case when latest.dry_run_at is null then null else jsonb_build_object('completedAt',latest.dry_run_at,'total',latest.dry_run_total,'valid',latest.dry_run_valid,'failed',latest.dry_run_failed,'issues',coalesce(latest.dry_run_issues,'[]'::jsonb),'approvedAt',latest.approved_at) end,
      'mappings',coalesce((select jsonb_agg(jsonb_build_object('mappingVersion',m.version,'entityType',m.definition->>'entityType','approvedAt',m.approved_at,
        'mappedTargets',coalesce((select jsonb_agg(f->>'targetField') from jsonb_array_elements(m.definition->'fields') f),'[]'::jsonb),
        'dryRun',case when m.dry_run_at is null then null else jsonb_build_object('completedAt',m.dry_run_at,'total',m.dry_run_total,'valid',m.dry_run_valid,'failed',m.dry_run_failed,'issues',coalesce(m.dry_run_issues,'[]'::jsonb),'approvedAt',m.approved_at) end) order by m.version desc)
        from public.app_connector_mappings m where m.connector_id=c.id and m.company_id=p_company_id),'[]'::jsonb)
    ) order by c.created_at desc) from public.app_connectors c left join lateral (
      select m.* from public.app_connector_mappings m where m.connector_id=c.id and m.company_id=p_company_id order by m.version desc limit 1
    ) latest on true where c.company_id=p_company_id),'[]'::jsonb)
  else '[]'::jsonb end
$$;
revoke all on function public.app_owner_connector_status(uuid,uuid) from public,anon,authenticated;
grant execute on function public.app_owner_connector_status(uuid,uuid) to service_role;

commit;
