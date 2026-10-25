import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('connector acceptance scripts are staging-only and test cross-company authorization', async () => {
  const staging = await readFile('scripts/connector-staging-e2e.mjs', 'utf8');
  const preview = await readFile('scripts/connector-preview-e2e.mjs', 'utf8');
  for (const source of [staging, preview]) {
    assert.match(source, /oncmtmrhmjlerbwkrecv\.supabase\.co/);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|STAGING_SUPABASE_SERVICE_ROLE_KEY/);
  }
  assert.match(staging, /ownerACross\.status, 403/);
  assert.match(staging, /employeeOwn\.status, 403/);
  assert.match(preview, /password\|privateKey\|service_role/);
});

test('staging acceptance is read-only and release requires evidence for the exact main commit', async () => {
  const acceptance = await readFile('.github/workflows/connector-staging-acceptance.yml', 'utf8');
  const publish = await readFile('.github/workflows/connector-publish.yml', 'utf8');
  const compose = await readFile('connector/compose.yaml', 'utf8');
  const install = await readFile('docs/synology-connector-install.md', 'utf8');
  assert.match(acceptance, /workflow_dispatch/);
  assert.match(acceptance, /refs\/heads\/main/);
  assert.match(acceptance, /npm run test:connector:staging/);
  assert.match(acceptance, /npm run test:connector:preview/);
  assert.doesNotMatch(acceptance, /SUPABASE_SERVICE_ROLE_KEY|db push|migrate|INSERT INTO/i);
  assert.match(publish, /staging_acceptance_run_id/);
  assert.match(publish, /needs: \[acceptance, verify\]/);
  assert.match(publish, /connector-release-evidence\.ts/);
  for (const asset of ['docker-compose.synology.yml', 'connector/config.example.json', 'connector/scripts/install.ps1', 'connector/scripts/update.ps1']) assert.ok(publish.includes(asset));
  assert.match(compose, /STAVBAFLOW_CONNECTOR_IMAGE:\?Set a verified connector image digest/);
  assert.doesNotMatch(compose, /:stable/);
  assert.match(install, /read-only kontrola adaptéru vybraného pro tento pilot/);
});
