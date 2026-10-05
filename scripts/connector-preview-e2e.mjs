import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const previewUrl = new URL(process.env.STAGING_PREVIEW_URL || '');
assert.equal(previewUrl.protocol, 'https:');
assert.ok(previewUrl.hostname.endsWith('.vercel.app'));
assert.equal(process.env.STAGING_SUPABASE_URL, 'https://oncmtmrhmjlerbwkrecv.supabase.co');
assert.ok(process.env.STAGING_SUPABASE_PUBLISHABLE_KEY && process.env.STAGING_OWNER_A_EMAIL && process.env.STAGING_OWNER_A_PASSWORD);
const client = createClient(process.env.STAGING_SUPABASE_URL, process.env.STAGING_SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
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
const status = await fetch(new URL(`/api/connector-status?companyId=${companyId}`, previewUrl), { headers });
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
