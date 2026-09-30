import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('../supabase/staging/20260930_import_worker.sql', import.meta.url), 'utf8');

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
