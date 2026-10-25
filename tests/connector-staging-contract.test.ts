import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('../supabase/staging/20261004_connector_contract.sql', import.meta.url), 'utf8');
const byodbSql = await readFile(new URL('../supabase/staging/20261025_byodb_operations.sql', import.meta.url), 'utf8');

test('connector staging tables are tenant-scoped, RLS-enabled and browser read-only', () => {
  for (const table of ['app_connector_enrollments', 'app_connectors', 'app_connector_mappings', 'app_connector_requests', 'app_connector_records', 'app_connector_commands']) {
    assert.match(sql, new RegExp(`create table[^;]*${table}`, 'i'));
    assert.match(sql, new RegExp(`alter table public\\.${table} enable row level security`, 'i'));
    assert.match(sql, new RegExp(`revoke all on public\\.${table} from anon, authenticated`, 'i'));
  }
});

test('privileged connector RPCs fix search_path and use explicit grants', () => {
  for (const fn of ['app_register_connector', 'app_reserve_connector_request', 'app_connector_heartbeat', 'app_ingest_connector_batch', 'app_get_connector_commands', 'app_ack_connector_command']) {
    const start = sql.indexOf(`function public.${fn}`);
    assert.notEqual(start, -1, `${fn} missing`);
    const section = sql.slice(start, sql.indexOf('$$;', start) + 3);
    assert.match(section, /security definer/i);
    assert.match(section, /set search_path = public, pg_temp/i);
    assert.match(sql, new RegExp(`revoke all on function public\\.${fn}[^;]+from public, anon, authenticated`, 'i'));
    assert.match(sql, new RegExp(`grant execute on function public\\.${fn}[^;]+to service_role`, 'i'));
  }
});

test('registration is expiring and single-use; ingest derives tenant from connector', () => {
  assert.match(sql, /code_hash bytea not null unique/i);
  assert.match(sql, /expires_at timestamptz not null/i);
  assert.match(sql, /consumed_at is null/i);
  assert.match(sql, /v_company_id[\s\S]+from public\.app_connectors[\s\S]+where id = p_connector_id/i);
  assert.doesNotMatch(sql, /app_ingest_connector_batch\s*\([^)]*p_company_id/i);
});

test('mapping requires a recorded dry run and explicit owner approval before writes', () => {
  assert.match(sql, /dry_run_at timestamptz/i);
  assert.match(sql, /dry_run_total integer/i);
  assert.match(sql, /p_dry_run[\s\S]+update public\.app_connector_mappings/i);
  assert.match(sql, /function public\.app_approve_connector_mapping/i);
  assert.match(sql, /approved_by/i);
  assert.match(sql, /'approve_mapping'/i);
});

test('connector commands can carry only the reviewed mapping definition', () => {
  const sectionStart = sql.indexOf('function public.app_get_connector_commands');
  const section = sql.slice(sectionStart, sql.indexOf('$$;', sectionStart) + 3);
  assert.match(section, /mappingDefinition/i);
  assert.match(section, /app_connector_mappings/i);
  assert.doesNotMatch(section, /public_key|code_hash|payload/i);
});

test('connector registration stores only encrypted HMAC secrets and rejects the legacy public-key path', () => {
  assert.match(sql, /secret_fingerprint bytea/i);
  assert.match(sql, /secret_ciphertext text/i);
  assert.match(sql, /p_secret_fingerprint bytea/i);
  assert.match(sql, /secret_ciphertext, scopes/i);
  assert.match(sql, /array\['heartbeat','ingest','commands','operations'\]/i);
  assert.doesNotMatch(sql, /public_key\s+text|p_public_key/i);
});

test('BYODB operation queue is idempotent, tenant-bound, leased, and service-only', () => {
  assert.match(byodbSql, /unique\s*\(company_id\s*,\s*idempotency_key\)/i);
  assert.match(byodbSql, /app_members[\s\S]+p_user_id[\s\S]+v_role not in \('owner','employee'\)/i);
  assert.match(byodbSql, /p_connector_id[\s\S]+company_id[\s\S]+p_company_id/i);
  assert.match(byodbSql, /for update skip locked/i);
  assert.match(byodbSql, /lease_expires_at/i);
  assert.match(byodbSql, /expected_source_version/i);
  assert.match(byodbSql, /idempotency_conflict/i);
  assert.match(byodbSql, /app_poll_byodb_operations\(p_connector_id uuid[\s\S]+company_id/i);
  assert.match(byodbSql, /app_ack_byodb_operation[\s\S]+p_connector_id[\s\S]+operation_id/i);
  assert.doesNotMatch(byodbSql, /grant\s+(select|insert|update|delete|all)[^;]+app_byodb_operations\s+to\s+(anon|authenticated)/i);
  assert.match(byodbSql, /if p_cursor is not null then[\s\S]+if v_before is null then return '\[\]'::jsonb/i);
  assert.match(byodbSql, /lease_expires_at is null or lease_expires_at<=now\(\)/i);
  const pollStart = byodbSql.indexOf('function public.app_poll_byodb_operations');
  const poll = byodbSql.slice(pollStart, byodbSql.indexOf('$$;', pollStart) + 3);
  assert.match(poll, /'mappingDefinition',m\.definition/i);
  assert.match(poll, /m\.version=c\.mapping_version[\s\S]+m\.definition->>'entityType'=c\.entity_type/i);
});

test('BYODB mode prevents public, CSV, or legacy Supabase lead writes from becoming a second source of truth', () => {
  assert.match(byodbSql, /function public\.app_block_cloud_lead_writes_for_byodb[\s\S]+security definer[\s\S]+BYODB_SOURCE_OF_TRUTH/i);
  assert.match(byodbSql, /create trigger app_block_cloud_lead_writes_for_byodb before insert or update or delete on public\.app_leads/i);
  assert.match(byodbSql, /create trigger app_block_cloud_company_writes_for_byodb before update of name,email,phone,address on public\.app_companies/i);
});

test('BYODB source acknowledgement commits the validated tenant projection and terminal state together', () => {
  assert.match(byodbSql, /app_ack_byodb_operation\([\s\S]+p_projection jsonb/i);
  const start = byodbSql.indexOf('function public.app_ack_byodb_operation');
  const ack = byodbSql.slice(start, byodbSql.indexOf('$$;', start) + 3);
  assert.match(ack, /app_connector_records[\s\S]+on conflict\(company_id,connector_id,entity_type,external_id\) do update/i);
  assert.match(ack, /where company_id=v_company_id and connector_id=p_connector_id[\s\S]+external_id=v_operation.external_id/i);
  assert.match(ack, /set status=p_status,source_version=p_source_version/);
  assert.match(byodbSql, /revoke all on function public\.app_ack_byodb_operation\(uuid,uuid,text,text,text,jsonb\) from public,anon,authenticated/i);
});

test('BYODB context and record RPCs derive tenant scope from active membership and hide unassigned employee leads', () => {
  assert.match(byodbSql, /function public\.app_get_byodb_context\(p_company_id uuid,p_user_id uuid\)/i);
  assert.match(byodbSql, /function public\.app_list_byodb_records\(p_company_id uuid,p_user_id uuid,p_entity_type text default 'lead'\)/i);
  const recordsStart = byodbSql.indexOf('function public.app_list_byodb_records');
  const records = byodbSql.slice(recordsStart, byodbSql.indexOf('$$;', recordsStart) + 3);
  assert.match(records, /app_members[\s\S]+p_user_id[\s\S]+active/i);
  assert.match(records, /assignedToEmail[\s\S]+v_email/i);
  assert.match(byodbSql, /p_entity_type not in \('company','lead'\)[\s\S]+v_role='employee' and p_entity_type<>'lead'/i);
  assert.match(byodbSql, /revoke all on function public\.app_list_byodb_records\(uuid,uuid,text\) from public,anon,authenticated/i);
  assert.match(byodbSql, /companyMappingVersion[\s\S]+companyMappedTargets/i);
});

test('BYODB database mode changes require owner access and approved company plus lead mappings', () => {
  assert.match(byodbSql, /function public\.app_set_company_database_mode\([\s\S]+v_role<>'owner'[\s\S]+definition->>'entityType'='lead'[\s\S]+definition->>'entityType'='company'[\s\S]+entity_type='company'[\s\S]+write_enabled/i);
  assert.match(byodbSql, /p_mode='managed_cloud'[\s\S]+status in \('pending','processing'\)[\s\S]+return false/i);
  assert.match(byodbSql, /revoke all on function public\.app_set_company_database_mode\(uuid,uuid,uuid,text,text,boolean\) from public,anon,authenticated/i);
  assert.match(byodbSql, /grant execute on function public\.app_set_company_database_mode\(uuid,uuid,uuid,text,text,boolean\) to service_role/i);
});
