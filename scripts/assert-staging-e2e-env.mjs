import assert from 'node:assert/strict';
import { validateStagingPreview } from './validate-staging-preview.mjs';
import { assertPreviewSupabaseTarget } from './assert-preview-supabase-target.mjs';

const required = [
  'STAGING_PREVIEW_URL',
  'PRODUCTION_BASE_URL',
  'STAGING_SUPABASE_URL',
  'STAGING_SUPABASE_PROJECT_REF',
  'PRODUCTION_SUPABASE_PROJECT_REF',
  'STAGING_SUPABASE_PUBLISHABLE_KEY',
  'STAGING_OWNER_A_EMAIL',
  'STAGING_OWNER_A_PASSWORD',
  'STAGING_EMPLOYEE_A_EMAIL',
  'STAGING_EMPLOYEE_A_PASSWORD',
  'STAGING_OWNER_B_EMAIL',
  'STAGING_OWNER_B_PASSWORD',
  'STAGING_COMPANY_A_ID',
  'STAGING_COMPANY_B_ID',
  'STAGING_OWNER_A_ID',
  'STAGING_OWNER_B_ID',
  'STAGING_EMPLOYEE_A_ID',
  'STAGING_EMPLOYEE_B_ID',
  'STAGING_LEAD_A_ID',
  'STAGING_LEAD_B_ID',
  'STAGING_PUBLIC_TENANT_KEY',
];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.error(`Missing staging E2E variables/secrets: ${missing.join(', ')}`);
  process.exit(1);
}
if (!process.env.STAGING_LEAD_B_FILE_PATH) {
  console.warn('Notes/files REST and private Storage isolation will be skipped until the reviewed schema and synthetic file fixture are available.');
}
if (process.env.STAGING_PUBLIC_INTAKE_ENABLED !== 'true') {
  console.warn('Public intake replay will be skipped until the staging SQL is reviewed/applied and the synthetic company intake is enabled.');
}

assert.notEqual(process.env.STAGING_SUPABASE_PROJECT_REF, process.env.PRODUCTION_SUPABASE_PROJECT_REF,
  'Refusing to run staging E2E against the production Supabase project.');
const stagingUrl = new URL(process.env.STAGING_SUPABASE_URL);
const safePreview = validateStagingPreview(process.env.STAGING_PREVIEW_URL, process.env.PRODUCTION_BASE_URL);
assert.equal(stagingUrl.protocol, 'https:', 'Staging Supabase URL must use HTTPS.');
assert.equal(stagingUrl.hostname, `${process.env.STAGING_SUPABASE_PROJECT_REF}.supabase.co`, 'Staging Supabase URL must match the declared staging project ref.');
assert.equal(stagingUrl.href, `${stagingUrl.origin}/`, 'Staging Supabase URL must not contain credentials, a path, query, or fragment.');
assert.match(stagingUrl.hostname, /^([a-z0-9-]+\.)?supabase\.co$/i, 'Staging Supabase URL must be a hosted Supabase HTTPS endpoint.');

await assertPreviewSupabaseTarget(
  safePreview,
  process.env.STAGING_SUPABASE_PROJECT_REF,
  process.env.PRODUCTION_SUPABASE_PROJECT_REF,
);

console.log('Staging E2E configuration is complete and isolated from production.');
