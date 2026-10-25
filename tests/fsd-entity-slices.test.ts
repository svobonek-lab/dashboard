import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

const entities = ['lead', 'employee', 'company'] as const;
const segments = ['ui', 'model', 'api'] as const;

test('Lead, Employee, and Company expose the required FSD entity slice structure', () => {
  for (const entity of entities) {
    for (const segment of segments) {
      const path = `src/entities/${entity}/${segment}`;
      assert.ok(existsSync(path), `Missing entity slice path: ${path}`);
    }
    const publicApi = `src/entities/${entity}/index.ts`;
    assert.ok(existsSync(publicApi), `Missing entity slice path: ${publicApi}`);
  }
  for (const path of ['src/entities/session/model', 'src/entities/session/index.ts', 'src/app/providers/OrganizationProvider.tsx', 'src/shared/api/supabase.ts', 'src/shared/api/crm-repository.ts']) {
    assert.ok(existsSync(path), `Missing entity slice path: ${path}`);
  }
});
