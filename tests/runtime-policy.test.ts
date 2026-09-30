import test from 'node:test';
import assert from 'node:assert/strict';
import { getRuntimePolicy, shouldFailClosed } from '../src/app/runtimePolicy';

test('production policy never permits local authentication or data fallback', () => {
  const policy = getRuntimePolicy({ PROD: true, VITE_SUPABASE_URL: 'https://db.test', VITE_SUPABASE_ANON_KEY: 'public' });
  assert.equal(policy.allowLocalMockAuth, false);
  assert.equal(policy.allowLocalDataFallback, false);
  assert.equal(shouldFailClosed(policy, { code: 'PGRST205' }), true);
});

test('development policy keeps the synthetic demo available', () => {
  const policy = getRuntimePolicy({ PROD: false });
  assert.equal(policy.allowLocalMockAuth, true);
  assert.equal(policy.allowLocalDataFallback, true);
  assert.equal(shouldFailClosed(policy, { code: 'PGRST205' }), false);
});

test('production without Supabase configuration fails closed before any fallback', () => {
  const policy = getRuntimePolicy({ PROD: true });
  assert.equal(shouldFailClosed(policy), true);
  assert.match(policy.failClosedMessage, /workspace/i);
});
