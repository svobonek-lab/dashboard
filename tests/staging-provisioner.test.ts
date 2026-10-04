import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../scripts/provision-staging-pilot.mjs', import.meta.url), 'utf8');

test('pilot provisioner is staging-only, explicit, and rolls back partial state', () => {
  assert.match(script, /https:\/\/oncmtmrhmjlerbwkrecv\.supabase\.co/);
  assert.match(script, /--apply/);
  assert.match(script, /app_provision_company/);
  assert.match(script, /inviteUserByEmail/);
  assert.match(script, /deleteUser/);
  assert.match(script, /from\('app_companies'\)\.delete\(\)/);
  assert.match(script, /public_form:\s*true/);
  assert.doesNotMatch(script, /console\.log\([^)]*SERVICE_ROLE/);
});

test('pilot provisioner requires an HTTPS application redirect', () => {
  assert.match(script, /appUrl\.protocol !== 'https:'/);
  assert.match(script, /new URL\('\/login', appUrl\)/);
});
