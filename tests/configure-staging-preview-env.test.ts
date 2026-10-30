import assert from 'node:assert/strict';
import test from 'node:test';
import { validateStagingPreviewConfig } from '../scripts/configure-staging-preview-env.mjs';

const valid = {
  GITHUB_REF: 'refs/heads/codex/staging-e2e-local-runner',
  STAGING_PREVIEW_GIT_BRANCH: 'codex/staging-e2e-local-runner',
  STAGING_SUPABASE_URL: 'https://xwzweltjvreqhjpbjrxa.supabase.co',
  STAGING_SUPABASE_PROJECT_REF: 'xwzweltjvreqhjpbjrxa',
  PRODUCTION_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv',
  STAGING_SUPABASE_PUBLISHABLE_KEY: 'synthetic-publishable-key',
  STAGING_SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-role-key',
  VERCEL_ORG_ID: 'team_example',
  VERCEL_PROJECT_ID: 'prj_example',
  VERCEL_TOKEN: 'synthetic-vercel-token',
};

test('staging Preview configuration accepts only the approved staging project and branch', () => {
  assert.deepEqual(validateStagingPreviewConfig(valid), []);
});

test('staging Preview configuration refuses any other branch', () => {
  assert.ok(validateStagingPreviewConfig({ ...valid, GITHUB_REF: 'refs/heads/main' }).some((error) => error.includes('approved staging branch')));
});

test('staging Preview configuration refuses production URL or project identity', () => {
  assert.ok(validateStagingPreviewConfig({ ...valid, STAGING_SUPABASE_URL: 'https://oncmtmrhmjlerbwkrecv.supabase.co' }).some((error) => error.includes('approved staging project URL')));
  assert.ok(validateStagingPreviewConfig({ ...valid, STAGING_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv' }).some((error) => error.includes('approved refs')));
});

test('staging Preview configuration requires the staging credentials and Vercel identity', () => {
  const invalid = { ...valid, STAGING_SUPABASE_SERVICE_ROLE_KEY: '', VERCEL_TOKEN: '' };
  const errors = validateStagingPreviewConfig(invalid);
  assert.ok(errors.some((error) => error.includes('STAGING_SUPABASE_SERVICE_ROLE_KEY')));
  assert.ok(errors.some((error) => error.includes('VERCEL_TOKEN')));
});
