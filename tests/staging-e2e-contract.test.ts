import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

test('staging E2E has isolated scenarios and an opt-in same-repository workflow', async () => {
  const root = process.cwd();
  const specs = await readdir(join(root, 'tests/e2e'));
  const workflow = await readFile(join(root, '.github/workflows/staging-e2e.yml'), 'utf8');
  const safety = await readFile(join(root, 'scripts/assert-staging-e2e-env.mjs'), 'utf8');
  const support = await readFile(join(root, 'tests/e2e/support.ts'), 'utf8');
  const ownerFlow = await readFile(join(root, 'tests/e2e/owner-critical-flow.spec.ts'), 'utf8');
  const tenantIsolation = await readFile(join(root, 'tests/e2e/tenant-rest-isolation.spec.ts'), 'utf8');
  const publicIntake = await readFile(join(root, 'tests/e2e/public-intake-idempotency.spec.ts'), 'utf8');
  const stagingDocs = await readFile(join(root, 'docs/staging-e2e.md'), 'utf8');

  assert.deepEqual(specs.filter((name) => name.endsWith('.spec.ts')).sort(), [
    'employee-assigned-scope.spec.ts',
    'logout-tenant-cache.spec.ts',
    'owner-critical-flow.spec.ts',
    'owner-menu.spec.ts',
    'public-intake-idempotency.spec.ts',
    'tenant-rest-isolation.spec.ts',
  ]);
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /runner_mode:/);
  assert.match(workflow, /local-ephemeral/);
  assert.match(workflow, /staging-e2e-local-runner/);
  assert.match(workflow, /fromJSON\('\["self-hosted","linux","x64","staging-e2e"\]'\)/);
  assert.match(workflow, /types: \[labeled\]/);
  assert.match(workflow, /contains\(github\.event\.pull_request\.labels\.\*\.name, 'e2e'\)/);
  assert.match(workflow, /github\.event\.pull_request\.head\.repo\.full_name == github\.repository/);
  assert.match(safety, /STAGING_SUPABASE_PROJECT_REF/);
  assert.match(safety, /PRODUCTION_SUPABASE_PROJECT_REF/);
  assert.match(safety, /PRODUCTION_BASE_URL/);
  for (const name of ['STAGING_OWNER_A_ID', 'STAGING_OWNER_B_ID']) {
    assert.match(workflow, new RegExp(`${name}:\\s*\\$\\{\\{\\s*vars\\.${name}\\s*\\}\\}`));
    assert.match(safety, new RegExp(name));
  }
  assert.equal((workflow.match(/STAGING_PUBLIC_INTAKE_ENABLED:\s*\$\{\{\s*vars\.STAGING_PUBLIC_INTAKE_ENABLED\s*\}\}/g) ?? []).length, 2);
  assert.match(safety, /STAGING_PUBLIC_INTAKE_ENABLED/);
  assert.match(publicIntake, /test\.skip\(!\(process\.env\.STAGING_PUBLIC_INTAKE_ENABLED === 'true'\)/);
  assert.match(safety, /STAGING_LEAD_B_FILE_PATH/);
  assert.match(safety, /Notes\/files REST and private Storage isolation.*skipped/i);
  assert.match(tenantIsolation, /test\.skip\(!process\.env\.STAGING_LEAD_B_FILE_PATH/);
  assert.match(workflow, /STAGING_PUBLIC_TENANT_KEY:\s*\$\{\{\s*vars\.STAGING_PUBLIC_TENANT_KEY\s*\}\}/);
  assert.doesNotMatch(workflow, /STAGING_PUBLIC_TENANT_KEY:\s*\$\{\{\s*secrets\.STAGING_PUBLIC_TENANT_KEY\s*\}\}/);
  assert.equal((workflow.match(/STAGING_OWNER_B_EMAIL:\s*\$\{\{\s*secrets\.STAGING_OWNER_B_EMAIL\s*\}\}/g) ?? []).length, 2);
  assert.equal((workflow.match(/STAGING_OWNER_B_PASSWORD:\s*\$\{\{\s*secrets\.STAGING_OWNER_B_PASSWORD\s*\}\}/g) ?? []).length, 2);
  assert.equal((workflow.match(/STAGING_LEAD_B_FILE_PATH:\s*\$\{\{\s*vars\.STAGING_LEAD_B_FILE_PATH\s*\}\}/g) ?? []).length, 2);
  assert.doesNotMatch(workflow + support, /SERVICE_ROLE|service_role|SUPABASE_SERVICE_ROLE_KEY/i);
  assert.match(support, /export async function restDelete/);
  assert.match(support, /export async function accessToken\(browser: Browser/);
  assert.match(support, /await signIn\(page, account\)/);
  assert.match(support, /endsWith\('-auth-token'\)/);
  assert.match(ownerFlow, /playwright-import@stavbaflow\.example\.test/);
  assert.match(ownerFlow, /cleanupSyntheticImport/);
  for (const name of ['STAGING_LEAD_A_ID', 'STAGING_LEAD_B_ID', 'STAGING_EMPLOYEE_B_ID']) {
    assert.match(workflow, new RegExp(name));
    assert.match(safety, new RegExp(name));
    assert.match(stagingDocs, new RegExp(name));
  }
  assert.match(stagingDocs, /seven external acceptance scenarios/);
});
