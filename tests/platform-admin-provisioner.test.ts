import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const script = readFileSync(new URL('../scripts/provision-platform-admin.mjs', import.meta.url), 'utf8');

test('platform administrator provisioner is staging-only and dry-run by default', () => {
  assert.match(script, /https:\/\/oncmtmrhmjlerbwkrecv\.supabase\.co/);
  assert.match(script, /apply:\s*false/);
  assert.match(script, /--apply/);
  assert.match(script, /Provisioning is restricted to the isolated StavbaFlow staging project/);
  assert.match(script, /Dry run only/i);
});

test('provisioner resolves exactly one existing Auth user and stores only UUID authorization', () => {
  assert.match(script, /auth\.admin\.listUsers/);
  assert.match(script, /matches\.length !== 1/);
  assert.match(script, /from\('app_platform_admins'\)\.upsert/);
  assert.match(script, /user_id:\s*authUser\.id/);
  assert.doesNotMatch(script, /inviteUserByEmail|createUser|updateUserById|password/);
  assert.doesNotMatch(script, /email:\s*normalizedEmail/);
});

test('provisioner masks operator email and records an audit event', () => {
  assert.match(script, /maskEmail/);
  assert.match(script, /from\('app_platform_audit_events'\)\.insert/);
  assert.doesNotMatch(script, /console\.log\([^)]*SERVICE_ROLE/i);
});
