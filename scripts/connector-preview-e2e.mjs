import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { assertIsolatedStagingProject } from './connector-staging-environment.mjs';
import { assertPreviewSupabaseTarget } from './assert-preview-supabase-target.mjs';
import { validateStagingPreview } from './validate-staging-preview.mjs';

const { stagingUrl } = assertIsolatedStagingProject(process.env);
const previewUrl = new URL(process.env.STAGING_PREVIEW_URL || '');
validateStagingPreview(previewUrl.href, process.env.PRODUCTION_BASE_URL);
await assertPreviewSupabaseTarget(previewUrl.origin, process.env.STAGING_SUPABASE_PROJECT_REF, process.env.PRODUCTION_SUPABASE_PROJECT_REF);
assert.ok(process.env.STAGING_SUPABASE_PUBLISHABLE_KEY && process.env.STAGING_OWNER_A_EMAIL && process.env.STAGING_OWNER_A_PASSWORD);
const client = createClient(stagingUrl, process.env.STAGING_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await client.auth.signInWithPassword({ email: process.env.STAGING_OWNER_A_EMAIL, password: process.env.STAGING_OWNER_A_PASSWORD });
assert.ifError(error);
const headers = {
  authorization: `Bearer ${data.session.access_token}`,
  'content-type': 'application/json',
  ...(process.env.STAGING_PREVIEW_BYPASS_TOKEN ? { 'x-vercel-protection-bypass': process.env.STAGING_PREVIEW_BYPASS_TOKEN } : {}),
};
const companyId = 'a0000000-0000-4000-8000-000000000001';
const page = await fetch(new URL('/integrations', previewUrl), { headers: process.env.STAGING_PREVIEW_BYPASS_TOKEN ? { 'x-vercel-protection-bypass': process.env.STAGING_PREVIEW_BYPASS_TOKEN } : {} });
assert.equal(page.status, 200);
assert.match(await page.text(), /<div id="root"><\/div>/);
const status = await fetch(new URL('/api/connector/status', previewUrl), {
  method: 'POST',
  headers,
  body: JSON.stringify({ companyId }),
});
const statusText = await status.text();
assert.equal(status.status, 200, statusText);
const body = JSON.parse(statusText);
assert.ok(Array.isArray(body.connectors));
assert.doesNotMatch(JSON.stringify(body), /password|privateKey|service_role|source_db_password/i);

if (process.env.CONNECTOR_EXPECTED_ID) {
  const connector = body.connectors.find(item => item.id === process.env.CONNECTOR_EXPECTED_ID);
  assert.ok(connector, 'Expected synthetic connector is absent.');
  assert.ok(['mapping_required','dry_run_required','ready','running','success','partial_failure','paused','outdated','revoked'].includes(connector.status));
}
console.log(JSON.stringify({ passed: true, previewContract: true, safeStatus: true, liveConnectorAsserted: Boolean(process.env.CONNECTOR_EXPECTED_ID) }));
