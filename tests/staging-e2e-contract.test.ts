import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

test('staging E2E has five isolated scenarios and an opt-in same-repository workflow', async () => {
  const root = process.cwd();
  const specs = await readdir(join(root, 'tests/e2e'));
  const workflow = await readFile(join(root, '.github/workflows/staging-e2e.yml'), 'utf8');
  const safety = await readFile(join(root, 'scripts/assert-staging-e2e-env.mjs'), 'utf8');
  const support = await readFile(join(root, 'tests/e2e/support.ts'), 'utf8');

  assert.deepEqual(specs.filter((name) => name.endsWith('.spec.ts')).sort(), [
    'employee-assigned-scope.spec.ts',
    'logout-tenant-cache.spec.ts',
    'owner-menu.spec.ts',
    'public-intake-idempotency.spec.ts',
    'tenant-rest-isolation.spec.ts',
  ]);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /types: \[labeled\]/);
  assert.match(workflow, /contains\(github\.event\.pull_request\.labels\.\*\.name, 'e2e'\)/);
  assert.match(workflow, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(safety, /STAGING_SUPABASE_PROJECT_REF/);
  assert.match(safety, /PRODUCTION_SUPABASE_PROJECT_REF/);
  assert.match(safety, /PRODUCTION_BASE_URL/);
  assert.doesNotMatch(workflow + support, /SERVICE_ROLE|service_role|SUPABASE_SERVICE_ROLE_KEY/i);
});
