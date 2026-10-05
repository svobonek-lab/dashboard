import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../context/OrganizationContext.tsx', import.meta.url), 'utf8');

test('production login does not inspect or activate legacy employees', () => {
  assert.match(source, /if \(!APP_SCHEMA_READS && isSupabaseConfigured && supabase\)/);
  assert.match(source, /if \(!empRec && !APP_SCHEMA_READS\)/);
});

test('production blocks legacy employee, project and platform mutations', () => {
  for (const functionName of ['deactivateEmployee', 'deleteEmployee', 'saveProject', 'deleteOrganizationAdmin', 'suspendOrganizationAdmin']) {
    const functionStart = source.indexOf(`const ${functionName} =`);
    assert.notEqual(functionStart, -1, `${functionName} should exist`);
    const functionBody = source.slice(functionStart, functionStart + 900);
    assert.match(functionBody, /BLOCK_LEGACY_WRITES && isSupabaseConfigured/);
  }
  const settingsStart = source.indexOf('const updateBrandingAdmin =');
  const settingsBody = source.slice(settingsStart, settingsStart + 4000);
  assert.match(settingsBody, /if \(APP_SCHEMA_READS && isSupabaseConfigured && supabase\)/);
  assert.match(settingsBody, /from\(['"]app_companies['"]\)/);
  assert.match(settingsBody, /BLOCK_LEGACY_WRITES && isSupabaseConfigured/);
});

test('production resolves platform role from the narrow database contract', () => {
  assert.match(source, /readPlatformIdentity\(supabase\)/);
  assert.match(source, /role: 'platform_admin'/);
  assert.doesNotMatch(source, /switchRoleToSuperAdmin/);
  assert.doesNotMatch(source, /svobonek@gmail\.com/i);
});
