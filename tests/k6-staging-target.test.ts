import assert from 'node:assert/strict';
import test from 'node:test';
import { validateK6StagingEnvironment } from '../load/validate-staging.js';

const environment = {
  STAGING_SUPABASE_PROJECT_REF: 'xwzweltjvreqhjpbjrxa',
  PRODUCTION_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv',
  STAGING_SUPABASE_URL: 'https://xwzweltjvreqhjpbjrxa.supabase.co',
  STAGING_PREVIEW_URL: 'https://dashboard-git-test-svobonek-6462s-projects.vercel.app',
  PRODUCTION_BASE_URL: 'https://stavbaflow.cz',
};

test('k6 accepts only an isolated staging and trusted Preview origin', () => {
  assert.equal(validateK6StagingEnvironment(environment).previewUrl, environment.STAGING_PREVIEW_URL);
  assert.throws(() => validateK6StagingEnvironment({ ...environment, STAGING_SUPABASE_PROJECT_REF: environment.PRODUCTION_SUPABASE_PROJECT_REF }), /distinct/);
  assert.throws(() => validateK6StagingEnvironment({ ...environment, STAGING_SUPABASE_URL: 'https://oncmtmrhmjlerbwkrecv.supabase.co' }), /isolated/);
  assert.throws(() => validateK6StagingEnvironment({ ...environment, STAGING_PREVIEW_URL: 'https://attacker.example' }), /isolated/);
  assert.throws(() => validateK6StagingEnvironment({ ...environment, STAGING_PREVIEW_URL: 'https://user:password@dashboard-git-test-svobonek-6462s-projects.vercel.app' }), /without credentials/);
});
