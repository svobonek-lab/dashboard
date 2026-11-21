import assert from 'node:assert/strict';
import test from 'node:test';
import { cleanupPlan } from '../scripts/cleanup-lead-attachments-staging.mjs';

const env = {
  STAGING_ATTACHMENT_CLEANUP_RUN_ID: '00c49be4',
  STAGING_SUPABASE_PROJECT_REF: 'xwzweltjvreqhjpbjrxa',
  STAGING_SUPABASE_URL: 'https://xwzweltjvreqhjpbjrxa.supabase.co',
  PRODUCTION_SUPABASE_PROJECT_REF: 'another-project',
  STAGING_COMPANY_A_ID: '3a51a21e-5b13-48d1-87e9-a5915b46d37d',
  STAGING_LEAD_A_ID: '76832e4c-9fbf-4877-84a2-cd830667844b',
  STAGING_SUPABASE_PUBLISHABLE_KEY: 'synthetic-key',
  STAGING_OWNER_A_EMAIL: 'owner@example.test',
  STAGING_OWNER_A_PASSWORD: 'synthetic-password',
};

test('cleanup plan names only exact synthetic files in one lead', () => {
  assert.deepEqual(cleanupPlan(env).names, [
    'owner-00c49be4.pdf', 'owner-00c49be4.jpg',
    'employee-00c49be4.pdf', 'employee-00c49be4.jpg', 'aged-00c49be4.pdf',
  ]);
});

test('cleanup rejects another project, company, lead or run', () => {
  for (const changed of [
    { STAGING_SUPABASE_URL: 'https://production.supabase.co' },
    { STAGING_COMPANY_A_ID: 'other-company' },
    { STAGING_LEAD_A_ID: 'other-lead' },
    { STAGING_ATTACHMENT_CLEANUP_RUN_ID: '../other' },
  ]) assert.throws(() => cleanupPlan({ ...env, ...changed }), /configuration is invalid/);
});
