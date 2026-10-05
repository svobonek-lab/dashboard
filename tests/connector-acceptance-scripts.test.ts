import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('connector acceptance scripts are staging-only and test cross-company authorization', async () => {
  const staging = await readFile('scripts/connector-staging-e2e.mjs', 'utf8');
  const preview = await readFile('scripts/connector-preview-e2e.mjs', 'utf8');
  for (const source of [staging, preview]) {
    assert.match(source, /oncmtmrhmjlerbwkrecv\.supabase\.co/);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|STAGING_SUPABASE_SERVICE_ROLE_KEY/);
  }
  assert.match(staging, /ownerACross\.status, 403/);
  assert.match(staging, /employeeOwn\.status, 403/);
  assert.match(preview, /password\|privateKey\|service_role/);
});
