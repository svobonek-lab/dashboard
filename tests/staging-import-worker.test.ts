import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('../supabase/staging/20260930_import_worker.sql', import.meta.url), 'utf8');
const setup = fs.readFileSync(new URL('../supabase/tests/staging_import_worker_setup.sql', import.meta.url), 'utf8');
const verify = fs.readFileSync(new URL('../supabase/tests/staging_import_worker_verify.sql', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8');

test('staging import worker is idempotent and service-only', () => {
  assert.ok(sql.includes('unique (company_id, fingerprint)'));
  assert.ok(sql.includes('app_leads_import_identity'));
  assert.ok(sql.includes('on conflict (company_id, import_fingerprint, source_record_id)'));
  assert.ok(sql.includes('create or replace function public.app_rollback_import'));
  assert.ok(sql.includes('revoke all on function public.app_import_leads'));
  assert.ok(sql.includes('grant execute on function public.app_import_leads'));
  assert.ok(sql.includes('to service_role'));
  assert.ok(sql.includes('revoke all on table public.app_imports from public, anon, authenticated'));
});

test('the import worker proposal has a disposable PostgreSQL security and idempotency check in CI', () => {
  assert.match(setup, /CREATE ROLE service_role NOLOGIN BYPASSRLS/i);
  assert.match(verify, /has_function_privilege\('anon'/i);
  assert.match(verify, /duplicate=true/);
  assert.match(verify, /inactive company import unexpectedly succeeded/);
  assert.match(verify, /app_rollback_import/);
  assert.match(workflow, /staging-import-worker-contract:/);
  assert.match(workflow, /supabase\/tests\/staging_import_worker_setup\.sql/);
  assert.match(workflow, /supabase\/tests\/staging_import_worker_verify\.sql/);
});
