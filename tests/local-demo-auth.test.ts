import assert from 'node:assert/strict';
import test from 'node:test';
import { LocalSupabaseMock } from '../lib/supabase.ts';

test('seeded local demo users do not contain reusable passwords', () => {
  const users = LocalSupabaseMock.getUsers();
  assert.ok(users.length > 0, 'local demo fixtures should remain available');
  assert.ok(users.every((user: any) => !user.password), 'seeded demo users must not include passwords');
});

test('production builds never permit local mock authentication', async () => {
  const supabaseModule = await import('../lib/supabase.ts') as Record<string, unknown>;
  assert.equal(typeof supabaseModule.canUseLocalMockAuth, 'function');
  const canUseLocalMockAuth = supabaseModule.canUseLocalMockAuth as (isProduction: boolean) => boolean;
  assert.equal(canUseLocalMockAuth(true), false);
  assert.equal(canUseLocalMockAuth(false), true);
});
