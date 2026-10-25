import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('connector acceptance scripts are staging-only and test cross-company authorization', async () => {
  const staging = await readFile('scripts/connector-staging-e2e.mjs', 'utf8');
  const preview = await readFile('scripts/connector-preview-e2e.mjs', 'utf8');
  const environment = await readFile('scripts/connector-staging-environment.mjs', 'utf8');
  for (const source of [staging, preview]) {
    assert.match(source, /assertIsolatedStagingProject\(process\.env\)/);
    assert.doesNotMatch(source, /oncmtmrhmjlerbwkrecv/);
    assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|STAGING_SUPABASE_SERVICE_ROLE_KEY/);
  }
  assert.match(environment, /PRODUCTION_SUPABASE_PROJECT_REF/);
  assert.match(environment, /STAGING_SUPABASE_PROJECT_REF/);
  assert.match(staging, /ownerACross\.status, 403/);
  assert.match(staging, /employeeOwn\.status, 403/);
  assert.match(preview, /password\|privateKey\|service_role/);
});

test('staging acceptance does not apply SQL and release requires evidence for the exact main commit', async () => {
  const acceptance = await readFile('.github/workflows/connector-staging-acceptance.yml', 'utf8');
  const publish = await readFile('.github/workflows/connector-publish.yml', 'utf8');
  const compose = await readFile('connector/compose.yaml', 'utf8');
  const install = await readFile('docs/synology-connector-install.md', 'utf8');
  assert.match(acceptance, /workflow_dispatch/);
  assert.match(acceptance, /refs\/heads\/main/);
  assert.match(acceptance, /npm run test:connector:staging/);
  assert.match(acceptance, /npm run test:connector:preview/);
  assert.match(acceptance, /PRODUCTION_SUPABASE_PROJECT_REF/);
  assert.match(acceptance, /STAGING_SUPABASE_PROJECT_REF/);
  assert.match(acceptance, /assertIsolatedStagingProject/);
  assert.doesNotMatch(acceptance, /SUPABASE_SERVICE_ROLE_KEY|db push|migrate|INSERT INTO/i);
  assert.match(publish, /staging_acceptance_run_id/);
  assert.match(publish, /needs: \[acceptance, verify\]/);
  assert.match(publish, /connector-release-evidence\.ts/);
  for (const asset of ['docker-compose.synology.yml', 'connector/config.example.json', 'connector/scripts/install.ps1', 'connector/scripts/update.ps1']) assert.ok(publish.includes(asset));
  assert.match(compose, /STAVBAFLOW_CONNECTOR_IMAGE:\?Set a verified connector image digest/);
  assert.doesNotMatch(compose, /:stable/);
  assert.match(install, /čtecí i omezená zápisová kontrola adaptéru vybraného pro tento pilot/);
  assert.match(install, /aktuální blocker/i);
  assert.match(install, /Rychlý postup ve třech krocích[\s\S]+1\. \*\*Připravte zdroj[\s\S]+2\. \*\*Vytvořte projekt[\s\S]+3\. \*\*Připojte a schvalte/);
  assert.match(install, /CONNECTOR_SECRET_ENCRYPTION_KEY/);
  assert.match(install, /source-db-write-password/);
});
