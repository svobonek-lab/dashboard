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
});
