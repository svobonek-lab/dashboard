import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const contract = readFileSync(
  new URL('../supabase/staging/20261013_lead_notes_files_contract.sql', import.meta.url),
  'utf8',
);
const acceptance = readFileSync(
  new URL('../supabase/tests/lead_notes_files_verify.sql', import.meta.url),
  'utf8',
);
const workflow = readFileSync(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8');

test('lead notes and files are append-only, tenant-scoped and bounded', () => {
  assert.match(contract, /create table if not exists public\.app_lead_notes/i);
  assert.match(contract, /create table if not exists public\.app_lead_files/i);
  assert.match(contract, /char_length\(trim\(body\)\) between 1 and 4000/i);
  assert.match(contract, /grant select, insert, delete on public\.app_lead_notes, public\.app_lead_files to authenticated/i);
  assert.doesNotMatch(contract, /grant[^;]*update[^;]*app_lead_(?:notes|files)/i);
  assert.match(contract, /author_id = auth\.uid\(\)/i);
  assert.match(contract, /created_at >= clock_timestamp\(\) - interval '15 minutes'/i);
  assert.match(contract, /app_private\.app_role\(company_id\) = 'owner'/i);
  assert.match(contract, /app_private\.app_can_lead\(company_id, lead_id\)/i);
});

test('private Storage contract enforces path, size, MIME and lead access', () => {
  assert.match(contract, /'lead-files'[\s\S]*false,[\s\S]*15728640/i);
  for (const mime of ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']) {
    assert.match(contract, new RegExp(mime.replace('/', '\\/')));
  }
  assert.match(contract, /lead_file_path_is_valid\(name\)/i);
  assert.match(contract, /owner_id = auth\.uid\(\)::text/i);
  assert.match(contract, /create policy app_lead_files_storage_select/i);
  assert.match(contract, /create policy app_lead_files_storage_insert/i);
  assert.match(contract, /create policy app_lead_files_storage_delete/i);
  assert.doesNotMatch(contract, /create policy app_lead_files_storage_update/i);
});

test('note and file additions are audited and employee lead fields have one allowlist', () => {
  assert.match(contract, /create or replace function app_private\.record_lead_attachment_event\(\)/i);
  assert.match(contract, /'NOTE_ADDED'/);
  assert.match(contract, /'FILE_ADDED'/);
  assert.match(contract, /create or replace function app_private\.employee_lead_editable_fields\(\)/i);
  assert.match(contract, /array\['status', 'description', 'phone', 'email', 'address'\]::text\[\]/i);
  assert.match(contract, /to_jsonb\(new\) - app_private\.employee_lead_editable_fields\(\)/i);
});

test('SQL acceptance covers two tenants, cross-company Storage and the delete window', () => {
  assert.match(acceptance, /12000000-0000-4000-8000-000000000001/);
  assert.match(acceptance, /22000000-0000-4000-8000-000000000002/);
  assert.match(acceptance, /employee B directly reads company A object/i);
  assert.match(acceptance, /employee B uploaded into company A path/i);
  assert.match(acceptance, /interval '16 minutes'/i);
  assert.match(acceptance, /owner could not delete old storage object/i);
  assert.match(acceptance, /note\/file additions were not audited/i);
});

test('CI executes the complete lead notes and files SQL contract', () => {
  assert.match(workflow, /lead-notes-files-contract:/);
  assert.match(workflow, /supabase\/tests\/lead_notes_files_setup\.sql/);
  assert.match(workflow, /supabase\/staging\/20261013_lead_notes_files_contract\.sql/);
  assert.match(workflow, /supabase\/tests\/lead_notes_files_verify\.sql/);
});
