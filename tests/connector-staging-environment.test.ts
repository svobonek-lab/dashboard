import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const acceptanceWorkflow = await readFile(new URL('../.github/workflows/connector-staging-acceptance.yml', import.meta.url), 'utf8');
const stagingE2e = await readFile(new URL('../scripts/connector-staging-e2e.mjs', import.meta.url), 'utf8');
const previewE2e = await readFile(new URL('../scripts/connector-preview-e2e.mjs', import.meta.url), 'utf8');
const environmentGuard = await readFile(new URL('../scripts/connector-staging-environment.mjs', import.meta.url), 'utf8');
const environmentModule = await import('../scripts/connector-staging-environment.mjs').catch(() => null);

test('connector staging guard refuses a Supabase project shared with production', () => {
  assert.ok(environmentModule?.assertIsolatedStagingProject, 'staging environment guard is missing');
  assert.throws(() => environmentModule.assertIsolatedStagingProject({
    STAGING_SUPABASE_URL: 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
    STAGING_SUPABASE_PROJECT_REF: 'aaaaaaaaaaaaaaaaaaaa',
    PRODUCTION_SUPABASE_PROJECT_REF: 'aaaaaaaaaaaaaaaaaaaa',
  }), /must be different from production/i);
});

test('connector staging guard accepts only a URL matching its separate staging ref', () => {
  assert.ok(environmentModule?.assertIsolatedStagingProject, 'staging environment guard is missing');
  const result = environmentModule.assertIsolatedStagingProject({
    STAGING_SUPABASE_URL: 'https://bbbbbbbbbbbbbbbbbbbb.supabase.co',
    STAGING_SUPABASE_PROJECT_REF: 'bbbbbbbbbbbbbbbbbbbb',
    PRODUCTION_SUPABASE_PROJECT_REF: 'aaaaaaaaaaaaaaaaaaaa',
  });
  assert.equal(result.stagingProjectRef, 'bbbbbbbbbbbbbbbbbbbb');
  assert.throws(() => environmentModule.assertIsolatedStagingProject({
    STAGING_SUPABASE_URL: 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co',
    STAGING_SUPABASE_PROJECT_REF: 'bbbbbbbbbbbbbbbbbbbb',
    PRODUCTION_SUPABASE_PROJECT_REF: 'aaaaaaaaaaaaaaaaaaaa',
  }), /does not match the staging project ref/i);
});

test('acceptance workflow and Preview check require explicit production and staging refs', () => {
  assert.match(acceptanceWorkflow, /PRODUCTION_SUPABASE_PROJECT_REF/);
  assert.match(acceptanceWorkflow, /STAGING_SUPABASE_PROJECT_REF/);
  assert.match(environmentGuard, /PRODUCTION_SUPABASE_PROJECT_REF/);
  assert.match(environmentGuard, /STAGING_SUPABASE_PROJECT_REF/);
  assert.match(environmentGuard, /PRODUCTION_SUPABASE_PROJECT_REF/);
  assert.match(stagingE2e, /assertIsolatedStagingProject\(process\.env\)/);
  assert.match(previewE2e, /assertIsolatedStagingProject\(process\.env\)/);
  assert.doesNotMatch(stagingE2e, /oncmtmrhmjlerbwkrecv/);
  assert.doesNotMatch(previewE2e, /oncmtmrhmjlerbwkrecv/);
});
