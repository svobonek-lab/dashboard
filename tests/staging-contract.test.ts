import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const contract = fs.readFileSync(new URL('../supabase/staging/20260930_app_contract.sql', import.meta.url), 'utf8');

test('staging contract contains tenant-safe lead policies and write checks', () => {
  assert.match(contract, /ALTER TABLE public\.app_leads ENABLE ROW LEVEL SECURITY/i);
  assert.match(contract, /FOR INSERT[\s\S]*app_role\(company_id\).*owner/i);
  assert.match(contract, /FOR UPDATE[\s\S]*WITH CHECK/i);
  assert.match(contract, /company_id\s*=\s*app_leads\.company_id/i);
});

test('staging contract classifies privileged RPC execution explicitly', () => {
  assert.match(contract, /app_provision_company/i);
  assert.match(contract, /app_submit_public_lead/i);
  assert.match(contract, /app_get_public_company/i);
  assert.match(contract, /GRANT EXECUTE ON FUNCTION public\.app_get_public_company\(text\) TO anon/i);
  assert.match(contract, /app_import_leads/i);
  assert.match(contract, /REVOKE ALL ON FUNCTION public\.app_import_leads/i);
  assert.match(contract, /GRANT EXECUTE ON FUNCTION public\.app_import_leads\([^)]*\) TO service_role/i);
});
