import test from 'node:test';
import assert from 'node:assert/strict';
import { tenantCacheKey, readTenantCache, removeTenantCache, writeTenantCache } from '../src/shared/lib/tenantCache';

function installStorage() {
  const values = new Map<string, string>();
  const storage = {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
  Object.defineProperty(globalThis, 'window', { value: { localStorage: storage }, configurable: true });
  return values;
}

test('cache keys are versioned and separated by organization', () => {
  assert.notEqual(tenantCacheKey('leads', 'company-a'), tenantCacheKey('leads', 'company-b'));
  assert.match(tenantCacheKey('leads', 'company-a'), /^stavbacore:v2:company-a:leads$/);
});

test('cache reads and writes stay inside the requested tenant scope', () => {
  installStorage();
  writeTenantCache('leads', [{ id: 'a' }], 'company-a');
  writeTenantCache('leads', [{ id: 'b' }], 'company-b');
  assert.deepEqual(readTenantCache('leads', 'company-a'), [{ id: 'a' }]);
  assert.deepEqual(readTenantCache('leads', 'company-b'), [{ id: 'b' }]);
  removeTenantCache('leads', 'company-a');
  assert.equal(readTenantCache('leads', 'company-a'), null);
  assert.deepEqual(readTenantCache('leads', 'company-b'), [{ id: 'b' }]);
});
