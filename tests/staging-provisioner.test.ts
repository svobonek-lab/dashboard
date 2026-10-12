import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../scripts/provision-staging-pilot.mjs', import.meta.url), 'utf8');

test('pilot provisioner is staging-only, explicit, and rolls back partial state', () => {
  assert.doesNotMatch(script, /oncmtmrhmjlerbwkrecv/);
  assert.match(script, /STAGING_SUPABASE_URL/);
  assert.match(script, /STAGING_SUPABASE_PROJECT_REF/);
  assert.match(script, /--apply/);
  assert.match(script, /app_platform_create_company_onboarding/);
  assert.match(script, /inviteUserByEmail/);
  assert.match(script, /app_platform_cancel_company_onboarding/);
  assert.match(script, /app_platform_create_company_onboarding/);
  assert.doesNotMatch(script, /console\.log\([^)]*SERVICE_ROLE/);
});

test('pilot provisioner requires an HTTPS application redirect', () => {
  assert.match(script, /appUrl\.protocol !== 'https:'/);
  assert.match(script, /new URL\('\/login', appUrl\)/);
});
