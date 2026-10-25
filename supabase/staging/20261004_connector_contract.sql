-- STAGING-ONLY PROPOSAL — DO NOT APPLY TO PRODUCTION
-- Outbound Synology connector contract. Review metadata and authorization tests
-- in the isolated staging project before executing this transaction.
begin;
create extension if not exists pgcrypto;

create table if not exists public.app_connector_enrollments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  code_hash bytea not null unique,
  secret_fingerprint bytea not null,
  secret_ciphertext text not null,
  scopes text[] not null default array['heartbeat','ingest','commands']::text[],
  created_by uuid not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  check (expires_at > created_at)
);
create table if not exists public.app_connectors (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  secret_ciphertext text not null,
  scopes text[] not null,
  status text not null default 'mapping_required',
  version text,
  last_heartbeat_at timestamptz,
  next_sync_at timestamptz,
  source_schema jsonb,
  last_run jsonb,
  pause_reason text,
  created_at timestamptz not null default now(),
  revoked_at timestamptz,
  unique (company_id, id)
);
alter table public.app_connector_enrollments add column if not exists secret_fingerprint bytea;
alter table public.app_connector_enrollments add column if not exists secret_ciphertext text;
alter table public.app_connectors add column if not exists secret_ciphertext text;
alter table public.app_connectors drop column if exists public_key;
create table if not exists public.app_connector_mappings (
  connector_id uuid not null references public.app_connectors(id) on delete cascade,
  company_id uuid not null references public.app_companies(id) on delete cascade,
  version integer not null check (version > 0),
  definition jsonb not null,
  dry_run_at timestamptz,
  dry_run_total integer check (dry_run_total is null or dry_run_total >= 0),
  dry_run_valid integer check (dry_run_valid is null or dry_run_valid >= 0),
  dry_run_failed integer check (dry_run_failed is null or dry_run_failed >= 0),
  dry_run_issues jsonb,
  approved_at timestamptz,
  approved_by uuid,
  created_at timestamptz not null default now(),
  primary key (connector_id, version),
  foreign key (company_id, connector_id) references public.app_connectors(company_id, id)
);
create table if not exists public.app_connector_requests (
  connector_id uuid not null references public.app_connectors(id) on delete cascade,
  request_id text not null check (request_id ~ '^[A-Za-z0-9_-]{1,160}$'),
  expires_at timestamptz not null,
  response jsonb,
  created_at timestamptz not null default now(),
  primary key (connector_id, request_id)
);
create table if not exists public.app_connector_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  connector_id uuid not null references public.app_connectors(id) on delete cascade,
  mapping_version integer not null,
  entity_type text not null,
  external_id text not null,
  fingerprint text not null check (fingerprint ~ '^[a-f0-9]{64}$'),
  payload jsonb not null,
  source_updated_at timestamptz,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, connector_id, entity_type, external_id),
  foreign key (company_id, connector_id) references public.app_connectors(company_id, id)
);
create table if not exists public.app_connector_commands (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.app_companies(id) on delete cascade,
  connector_id uuid not null references public.app_connectors(id) on delete cascade,
  command_type text not null check (command_type in ('sync_now','pause','resume','refresh_mapping','approve_mapping','rotate_identity')),
  mapping_version integer,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  acknowledged_at timestamptz,
  foreign key (company_id, connector_id) references public.app_connectors(company_id, id)
);

alter table public.app_connector_enrollments enable row level security;
alter table public.app_connectors enable row level security;
alter table public.app_connector_mappings enable row level security;
alter table public.app_connector_requests enable row level security;
alter table public.app_connector_records enable row level security;
alter table public.app_connector_commands enable row level security;
revoke all on public.app_connector_enrollments from anon, authenticated;
revoke all on public.app_connectors from anon, authenticated;
revoke all on public.app_connector_mappings from anon, authenticated;
revoke all on public.app_connector_requests from anon, authenticated;
revoke all on public.app_connector_records from anon, authenticated;
revoke all on public.app_connector_commands from anon, authenticated;

drop function if exists public.app_register_connector(text, text);
create or replace function public.app_register_connector(p_enrollment_code text, p_secret_fingerprint bytea)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_enrollment public.app_connector_enrollments%rowtype; v_connector_id uuid;
begin
  if nullif(trim(p_enrollment_code), '') is null or p_secret_fingerprint is null then raise exception 'registration invalid'; end if;
  select * into v_enrollment from public.app_connector_enrollments
   where code_hash = digest(trim(p_enrollment_code), 'sha256') and secret_fingerprint=p_secret_fingerprint and secret_ciphertext is not null and consumed_at is null and expires_at > now()
   for update;
  if not found then raise exception 'registration invalid'; end if;
  insert into public.app_connectors(company_id, secret_ciphertext, scopes)
  values(v_enrollment.company_id, v_enrollment.secret_ciphertext, v_enrollment.scopes) returning id into v_connector_id;
  update public.app_connector_enrollments set consumed_at = now() where id = v_enrollment.id and consumed_at is null;
  if not found then raise exception 'registration invalid'; end if;
  return jsonb_build_object('connector_id', v_connector_id, 'company_id', v_enrollment.company_id);
end; $$;
revoke all on function public.app_register_connector(text, bytea) from public, anon, authenticated;
grant execute on function public.app_register_connector(text, bytea) to service_role;

create or replace function public.app_reserve_connector_request(p_connector_id uuid, p_request_id text, p_expires_at timestamptz)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists(select 1 from public.app_connectors where id=p_connector_id and revoked_at is null) then return false; end if;
  insert into public.app_connector_requests(connector_id, request_id, expires_at)
  values(p_connector_id, p_request_id, least(p_expires_at, now()+interval '15 minutes')) on conflict do nothing;
  return found;
end; $$;
revoke all on function public.app_reserve_connector_request(uuid, text, timestamptz) from public, anon, authenticated;
grant execute on function public.app_reserve_connector_request(uuid, text, timestamptz) to service_role;

create or replace function public.app_connector_heartbeat(p_connector_id uuid, p_status text, p_version text, p_source_schema jsonb default null, p_metrics jsonb default null)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if p_source_schema is not null and (jsonb_typeof(p_source_schema)<>'object' or pg_column_size(p_source_schema)>262144) then raise exception 'source schema invalid'; end if;
  if p_metrics is not null and (jsonb_typeof(p_metrics)<>'object' or pg_column_size(p_metrics)>16384) then raise exception 'metrics invalid'; end if;
  update public.app_connectors set status=p_status, version=left(p_version,40), last_heartbeat_at=now(),
    source_schema=coalesce(p_source_schema,source_schema),last_run=coalesce(p_metrics,last_run),
    next_sync_at=case when p_status='paused' then null else now()+interval '1 minute' end
   where id=p_connector_id and revoked_at is null;
  return found;
end; $$;
revoke all on function public.app_connector_heartbeat(uuid, text, text, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.app_connector_heartbeat(uuid, text, text, jsonb, jsonb) to service_role;

create or replace function public.app_ingest_connector_batch(p_connector_id uuid, p_mapping_version integer, p_request_id text, p_dry_run boolean, p_records jsonb, p_summary jsonb default null)
returns jsonb language plpgsql security definer set search_path = public, pg_temp as $$
declare v_company_id uuid; v_mapping jsonb; v_record jsonb; v_results jsonb := '[]'::jsonb; v_status text; v_response jsonb;
begin
  select company_id into v_company_id from public.app_connectors where id = p_connector_id and revoked_at is null and 'ingest'=any(scopes);
  if v_company_id is null then raise exception 'connector rejected'; end if;
  if jsonb_typeof(p_records)<>'array' or jsonb_array_length(p_records)>250 then raise exception 'batch invalid'; end if;
  select definition into v_mapping from public.app_connector_mappings where connector_id=p_connector_id and company_id=v_company_id and version=p_mapping_version and (p_dry_run or approved_at is not null);
  if v_mapping is null then raise exception 'mapping not approved'; end if;
  if p_dry_run and (p_summary is null or jsonb_typeof(p_summary)<>'object' or coalesce((p_summary->>'total')::integer,-1)<0 or coalesce((p_summary->>'total')::integer,251)>250 or coalesce((p_summary->>'valid')::integer,-1)<>jsonb_array_length(p_records) or coalesce((p_summary->>'total')::integer,-1)<>coalesce((p_summary->>'valid')::integer,-1)+coalesce((p_summary->>'failed')::integer,-1) or coalesce(jsonb_array_length(p_summary->'issues'),-1)>100) then raise exception 'dry run summary invalid'; end if;
  select response into v_response from public.app_connector_requests where connector_id=p_connector_id and request_id=p_request_id;
  if v_response is not null then return v_response; end if;
  for v_record in select value from jsonb_array_elements(p_records) loop
    if v_record->>'externalId' is null or v_record->>'type' is null or (v_record->>'fingerprint') !~ '^[a-f0-9]{64}$' or v_record->>'type'<>v_mapping->>'entityType' or v_record->>'sourceTable'<>concat(v_mapping->>'schema','.',v_mapping->>'table') then raise exception 'record invalid'; end if;
    v_status := case when coalesce((v_record->'payload'->>'archived')::boolean,false) then 'archived' else 'updated' end;
    if not p_dry_run then
      insert into public.app_connector_records(company_id,connector_id,mapping_version,entity_type,external_id,fingerprint,payload,source_updated_at,archived_at)
      values(v_company_id,p_connector_id,p_mapping_version,v_record->>'type',v_record->>'externalId',v_record->>'fingerprint',v_record->'payload',nullif(v_record->>'sourceUpdatedAt','')::timestamptz,case when v_status='archived' then now() end)
      on conflict(company_id,connector_id,entity_type,external_id) do update set mapping_version=excluded.mapping_version,fingerprint=excluded.fingerprint,payload=excluded.payload,source_updated_at=excluded.source_updated_at,archived_at=excluded.archived_at,updated_at=now();
    end if;
    v_results := v_results || jsonb_build_array(jsonb_build_object('externalId',v_record->>'externalId','type',v_record->>'type','status',case when p_dry_run then 'unchanged' else v_status end));
  end loop;
  if p_dry_run then
    update public.app_connector_mappings set dry_run_at=now(),dry_run_total=(p_summary->>'total')::integer,
      dry_run_valid=(p_summary->>'valid')::integer,dry_run_failed=(p_summary->>'failed')::integer,
      dry_run_issues=p_summary->'issues',approved_at=null,approved_by=null
      where connector_id=p_connector_id and company_id=v_company_id and version=p_mapping_version;
    update public.app_connectors set status='dry_run_required',last_run=jsonb_build_object('completedAt',now(),'processed',(p_summary->>'valid')::integer,'changed',0,'failed',(p_summary->>'failed')::integer)
      where id=p_connector_id;
  else
    update public.app_connectors set status='success',last_run=jsonb_build_object('completedAt',now(),'processed',jsonb_array_length(p_records),'changed',jsonb_array_length(p_records),'failed',0)
      where id=p_connector_id;
  end if;
  v_response := jsonb_build_object('version',1,'requestId',p_request_id,'accepted',true,'results',v_results);
  update public.app_connector_requests set response=v_response where connector_id=p_connector_id and request_id=p_request_id;
  if not found then raise exception 'request not reserved'; end if;
  return v_response;
end; $$;
revoke all on function public.app_ingest_connector_batch(uuid, integer, text, boolean, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.app_ingest_connector_batch(uuid, integer, text, boolean, jsonb, jsonb) to service_role;

create or replace function public.app_get_connector_commands(p_connector_id uuid)
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select coalesce(jsonb_agg(jsonb_build_object('version',1,'id',cmd.id,'connectorId',cmd.connector_id,'type',cmd.command_type,'expiresAt',cmd.expires_at,'mappingVersion',cmd.mapping_version,'mappingDefinition',case when cmd.command_type='refresh_mapping' then map.definition else null end) order by cmd.created_at),'[]'::jsonb)
  from public.app_connector_commands cmd left join public.app_connector_mappings map on map.connector_id=cmd.connector_id and map.version=cmd.mapping_version
  where cmd.connector_id=p_connector_id and cmd.acknowledged_at is null and cmd.expires_at>now()
    and exists(select 1 from public.app_connectors c where c.id=p_connector_id and c.revoked_at is null)
$$;
revoke all on function public.app_get_connector_commands(uuid) from public, anon, authenticated;
grant execute on function public.app_get_connector_commands(uuid) to service_role;

create or replace function public.app_ack_connector_command(p_connector_id uuid, p_command_id uuid)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  update public.app_connector_commands set acknowledged_at=coalesce(acknowledged_at,now()) where id=p_command_id and connector_id=p_connector_id;
  return found;
end; $$;
revoke all on function public.app_ack_connector_command(uuid, uuid) from public, anon, authenticated;
grant execute on function public.app_ack_connector_command(uuid, uuid) to service_role;

drop function if exists public.app_create_connector_enrollment(uuid, uuid, bytea, timestamptz);
create or replace function public.app_create_connector_enrollment(p_company_id uuid, p_user_id uuid, p_code_hash bytea, p_secret_fingerprint bytea, p_secret_ciphertext text, p_expires_at timestamptz)
returns uuid language plpgsql security definer set search_path = public, pg_temp as $$
declare v_id uuid;
begin
  if not exists(select 1 from public.app_members where company_id=p_company_id and user_id=p_user_id and active and role='owner') then raise exception 'owner required'; end if;
  if p_expires_at>now()+interval '15 minutes' or p_expires_at<=now() or p_secret_fingerprint is null or nullif(p_secret_ciphertext,'') is null then raise exception 'enrollment invalid'; end if;
  insert into public.app_connector_enrollments(company_id,code_hash,secret_fingerprint,secret_ciphertext,created_by,expires_at) values(p_company_id,p_code_hash,p_secret_fingerprint,p_secret_ciphertext,p_user_id,p_expires_at) returning id into v_id;
  return v_id;
end; $$;
revoke all on function public.app_create_connector_enrollment(uuid, uuid, bytea, bytea, text, timestamptz) from public, anon, authenticated;
grant execute on function public.app_create_connector_enrollment(uuid, uuid, bytea, bytea, text, timestamptz) to service_role;

create or replace function public.app_owner_connector_status(p_company_id uuid, p_user_id uuid)
returns jsonb language sql security definer set search_path = public, pg_temp as $$
  select case when exists(select 1 from public.app_members where company_id=p_company_id and user_id=p_user_id and active and role='owner') then
    coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'status',case when c.revoked_at is not null then 'revoked' else c.status end,'version',c.version,'lastHeartbeatAt',c.last_heartbeat_at,'nextSyncAt',c.next_sync_at,'sourceSchema',c.source_schema,'lastRun',c.last_run,'pauseReason',c.pause_reason,'mappingVersion',latest.version,'approvedMappingVersion',case when latest.approved_at is not null then latest.version else null end,'dryRun',case when latest.dry_run_at is null then null else jsonb_build_object('completedAt',latest.dry_run_at,'total',latest.dry_run_total,'valid',latest.dry_run_valid,'failed',latest.dry_run_failed,'issues',coalesce(latest.dry_run_issues,'[]'::jsonb),'approvedAt',latest.approved_at) end))
      from public.app_connectors c left join lateral (select m.* from public.app_connector_mappings m where m.connector_id=c.id order by m.version desc limit 1) latest on true where c.company_id=p_company_id),'[]'::jsonb)
  else '[]'::jsonb end
$$;
revoke all on function public.app_owner_connector_status(uuid, uuid) from public, anon, authenticated;
grant execute on function public.app_owner_connector_status(uuid, uuid) to service_role;

create or replace function public.app_save_connector_mapping(p_company_id uuid,p_user_id uuid,p_connector_id uuid,p_definition jsonb)
returns integer language plpgsql security definer set search_path = public, pg_temp as $$
declare v_version integer;
begin
  if not exists(select 1 from public.app_members where company_id=p_company_id and user_id=p_user_id and active and role='owner') or not exists(select 1 from public.app_connectors where id=p_connector_id and company_id=p_company_id and revoked_at is null) then raise exception 'owner required'; end if;
  select coalesce(max(version),0)+1 into v_version from public.app_connector_mappings where connector_id=p_connector_id;
  insert into public.app_connector_mappings(connector_id,company_id,version,definition) values(p_connector_id,p_company_id,v_version,p_definition || jsonb_build_object('mappingVersion',v_version));
  insert into public.app_connector_commands(company_id,connector_id,command_type,mapping_version,expires_at) values(p_company_id,p_connector_id,'refresh_mapping',v_version,now()+interval '15 minutes');
  return v_version;
end; $$;
revoke all on function public.app_save_connector_mapping(uuid, uuid, uuid, jsonb) from public, anon, authenticated;
grant execute on function public.app_save_connector_mapping(uuid, uuid, uuid, jsonb) to service_role;

create or replace function public.app_approve_connector_mapping(p_company_id uuid,p_user_id uuid,p_connector_id uuid,p_mapping_version integer)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists(select 1 from public.app_members where company_id=p_company_id and user_id=p_user_id and active and role='owner') then return false; end if;
  update public.app_connector_mappings set approved_at=coalesce(approved_at,now()),approved_by=coalesce(approved_by,p_user_id)
    where connector_id=p_connector_id and company_id=p_company_id and version=p_mapping_version and dry_run_at is not null and dry_run_failed=0
      and exists(select 1 from public.app_connectors c where c.id=p_connector_id and c.company_id=p_company_id and c.revoked_at is null);
  if not found then return false; end if;
  insert into public.app_connector_commands(company_id,connector_id,command_type,mapping_version,expires_at)
    values(p_company_id,p_connector_id,'approve_mapping',p_mapping_version,now()+interval '15 minutes');
  return true;
end; $$;
revoke all on function public.app_approve_connector_mapping(uuid, uuid, uuid, integer) from public, anon, authenticated;
grant execute on function public.app_approve_connector_mapping(uuid, uuid, uuid, integer) to service_role;

create or replace function public.app_owner_connector_command(p_company_id uuid,p_user_id uuid,p_connector_id uuid,p_command text)
returns boolean language plpgsql security definer set search_path = public, pg_temp as $$
begin
  if not exists(select 1 from public.app_members where company_id=p_company_id and user_id=p_user_id and active and role='owner') then return false; end if;
  if p_command='revoke' then update public.app_connectors set revoked_at=coalesce(revoked_at,now()),status='revoked' where id=p_connector_id and company_id=p_company_id; return found; end if;
  if p_command not in ('sync_now','pause','resume','refresh_mapping','rotate_identity') then return false; end if;
  insert into public.app_connector_commands(company_id,connector_id,command_type,expires_at)
    select company_id,id,p_command,now()+interval '15 minutes' from public.app_connectors where id=p_connector_id and company_id=p_company_id and revoked_at is null;
  return found;
end; $$;
revoke all on function public.app_owner_connector_command(uuid, uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.app_owner_connector_command(uuid, uuid, uuid, text) to service_role;

commit;
