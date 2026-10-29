import assert from 'node:assert/strict';
import test from 'node:test';
import { loadFixturePlan, provisionLoadFixtures } from '../scripts/seed-load-fixtures';
import { assertStagingLoadEnvironment } from '../scripts/assert-staging-load-env.mjs';

test('load fixture plan has 30 owners and 100 employees with distinct synthetic identities', () => {
  const plan = loadFixturePlan('abcdef123456');
  assert.equal(plan.length, 130);
  assert.equal(plan.filter(item => item.role === 'owner').length, 30);
  assert.equal(plan.filter(item => item.role === 'employee').length, 100);
  assert.equal(new Set(plan.map(item => item.slug)).size, 130);
  assert.equal(new Set(plan.map(item => item.email)).size, 130);
  assert.ok(plan.every(item => item.email.endsWith('@stavbaflow.example.test')));
  const smoke = loadFixturePlan('abcdef123456', true);
  assert.deepEqual(smoke.map(item => item.role), ['owner', 'employee']);
});

test('load provisioning refuses production before credentials or writes are needed', async () => {
  await assert.rejects(() => provisionLoadFixtures({
    STAGING_SUPABASE_URL: 'https://oncmtmrhmjlerbwkrecv.supabase.co',
    STAGING_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv',
    PRODUCTION_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv',
  }), /Refusing to seed/);
});

test('load preflight refuses a production ref without contacting Preview', async () => {
  let contactedPreview = false;
  await assert.rejects(() => assertStagingLoadEnvironment({
    STAGING_SUPABASE_URL: 'https://oncmtmrhmjlerbwkrecv.supabase.co',
    STAGING_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv',
    PRODUCTION_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv',
    STAGING_PREVIEW_URL: 'https://dashboard-example-svobonek-6462s-projects.vercel.app',
    PRODUCTION_BASE_URL: 'https://stavbaflow.cz',
  }, async () => { contactedPreview = true; throw new Error('Should not contact Preview.'); }), /Refusing load/);
  assert.equal(contactedPreview, false);
});
