import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const sql = fs.readFileSync(new URL('../supabase/staging/20260930_import_worker.sql', import.meta.url), 'utf8');
const setup = fs.readFileSync(new URL('../supabase/tests/staging_import_worker_setup.sql', import.meta.url), 'utf8');
const verify = fs.readFileSync(new URL('../supabase/tests/staging_import_worker_verify.sql', import.meta.url), 'utf8');
const api = fs.readFileSync(new URL('../api/import-leads.ts', import.meta.url), 'utf8');
const workflow = fs.readFileSync(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8');

test('staging import worker is idempotent and service-only', () => {
  assert.ok(sql.includes('create unique index if not exists app_imports_company_fingerprint'));
  assert.ok(sql.includes('add column if not exists actor uuid'));
  assert.ok(sql.includes('add column if not exists imported integer'));
  assert.ok(sql.includes('add column if not exists fingerprint text'));
  assert.ok(sql.includes('p_actor_id uuid'));
  assert.ok(sql.includes('drop function if exists public.app_import_leads(uuid, jsonb, text, text)'));
  assert.ok(sql.includes('set imported = v_created + v_updated'));
  assert.match(api, /p_actor_id:\s*authData\.user\.id/);
  assert.ok(sql.includes('app_leads_import_identity'));
  assert.ok(sql.includes('on conflict (company_id, import_fingerprint, source_record_id)'));
  assert.ok(sql.includes('create or replace function public.app_rollback_import'));
  assert.ok(sql.includes('create or replace function public.app_mark_import_lead_changed'));
  assert.ok(sql.includes('rollback_blocked boolean not null default false'));
  assert.ok(sql.includes("raise exception 'import has changed rows; rollback refused'"));
  assert.match(sql, /where company_id = p_company_id[\s\S]+and fingerprint = p_fingerprint[\s\S]+for update;/);
  assert.ok(sql.includes('revoke all on function public.app_import_leads'));
  assert.ok(sql.includes('grant execute on function public.app_import_leads'));
  assert.ok(sql.includes('to service_role'));
  assert.ok(sql.includes('revoke all on table public.app_imports from public, anon, authenticated'));
});

test('the import worker proposal has a disposable PostgreSQL security and idempotency check in CI', () => {
  assert.match(setup, /CREATE ROLE service_role NOLOGIN BYPASSRLS/i);
  assert.ok(setup.includes('legacy app_imports shape found in the live staging metadata'));
  assert.match(verify, /has_function_privilege\('anon'/i);
  assert.match(verify, /legacy four-argument import RPC must be removed/);
  assert.match(verify, /schema bridge did not preserve and enrich legacy import history/);
  assert.match(verify, /duplicate=true/);
  assert.match(verify, /inactive company import unexpectedly succeeded/);
  assert.match(verify, /app_rollback_import/);
  assert.match(verify, /rollback unexpectedly removed an owner-edited lead/);
  assert.match(workflow, /staging-import-worker-contract:/);
  assert.match(workflow, /supabase\/tests\/staging_import_worker_setup\.sql/);
  assert.match(workflow, /supabase\/tests\/staging_import_worker_verify\.sql/);
});
