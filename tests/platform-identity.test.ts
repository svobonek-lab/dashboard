import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import { readPlatformIdentity, resolveApplicationIdentity } from '../src/app/platformIdentity';
import { canAccessAdmin, canManageCompany, canViewRevenue, getDefaultRouteForRole } from '../src/app/permissions';

test('active platform identity is resolved before company membership', () => {
  const result = resolveApplicationIdentity(
    { role: 'platform_admin', active: true },
    { organization_id: 'company-a', role: 'owner' },
  );
  assert.deepEqual(result, { organization_id: '', role: 'platform_admin' });
  assert.equal(getDefaultRouteForRole(result.role), '/admin');
});

test('inactive platform role falls through to verified tenant membership', () => {
  assert.deepEqual(
    resolveApplicationIdentity(
      { role: null, active: false },
      { organization_id: 'company-a', role: 'employee' },
    ),
    { organization_id: 'company-a', role: 'employee' },
  );
  assert.throws(() => resolveApplicationIdentity(null, null), /aktivní přístup/i);
});

test('platform administrator has control-plane access but no tenant owner privileges', () => {
  assert.equal(canAccessAdmin('platform_admin'), true);
  assert.equal(canManageCompany('platform_admin'), false);
  assert.equal(canViewRevenue('platform_admin'), false);
});

test('platform identity reader accepts only the narrow active role result', async () => {
  const calls: string[] = [];
  const active = await readPlatformIdentity({ rpc: async (name: string) => {
    calls.push(name);
    return { data: { role: 'platform_admin', active: true }, error: null };
  } });
  assert.deepEqual(active, { role: 'platform_admin', active: true });
  assert.deepEqual(calls, ['app_get_my_platform_role']);

  assert.equal(await readPlatformIdentity({ rpc: async () => ({ data: { role: 'owner', active: true }, error: null }) }), null);
  assert.equal(await readPlatformIdentity({ rpc: async () => ({ data: null, error: { code: 'PGRST202' } }) }), null);
});

test('runtime sources contain no email-based platform authorization', () => {
  const context = readFileSync(new URL('../context/OrganizationContext.tsx', import.meta.url), 'utf8');
  const switcher = readFileSync(new URL('../components/CompanySwitcher.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(context, /svobonek@gmail\.com/i);
  assert.doesNotMatch(switcher, /svobonek@gmail\.com/i);
  assert.doesNotMatch(context, /switchRoleToSuperAdmin/);
});
