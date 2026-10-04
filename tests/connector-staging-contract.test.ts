import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const sql = await readFile(new URL('../supabase/staging/20261004_connector_contract.sql', import.meta.url), 'utf8');

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
