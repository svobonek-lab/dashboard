import assert from 'node:assert/strict';
import test from 'node:test';
import { clearTenantCaches, TENANT_CACHE_NAMES } from '../src/shared/lib/tenantCache';

class MemoryStorage {
  private readonly values = new Map<string, string>();
  constructor(entries: Array<[string, string]>) { for (const [key, value] of entries) this.values.set(key, value); }
  get length() { return this.values.size; }
  key(index: number) { return [...this.values.keys()][index] ?? null; }
  removeItem(key: string) { this.values.delete(key); }
  get keys() { return [...this.values.keys()]; }
}

test('logout removes every tenant cache version and legacy workspace cache, preserving preferences', () => {
  const storage = new MemoryStorage([
    [`stavbacore:v2:company-a:${TENANT_CACHE_NAMES.leads}`, 'private-leads'],
    [`stavbacore:v2:company-b:${TENANT_CACHE_NAMES.onboarding}`, 'private-onboarding'],
    ['stavbacore:v1:old-company:leads', 'old-private-leads'],
    ['leads_cache_company-a', 'legacy-private-leads'],
    ['demo_leads_cache_company-a', 'legacy-demo-leads'],
    ['demo_leads_cache', 'demo-leads'],
    ['theme', 'dark'],
    ['locale', 'cs'],
  ]);

  clearTenantCaches(storage as unknown as Storage);

  assert.deepEqual(storage.keys, ['theme', 'locale']);
});
