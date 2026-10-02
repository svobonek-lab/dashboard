import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.STAGING_SUPABASE_URL;
const publishableKey = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
const previewUrl = process.env.STAGING_PREVIEW_URL;
const previewBypassToken = process.env.STAGING_PREVIEW_BYPASS_TOKEN;
const email = process.env.STAGING_OWNER_EMAIL;
const password = process.env.STAGING_OWNER_PASSWORD;

assert.equal(supabaseUrl, 'https://oncmtmrhmjlerbwkrecv.supabase.co');
assert.ok(publishableKey && previewUrl && email && password, 'Missing staging Preview verification variables.');
const parsedPreview = new URL(previewUrl);
assert.equal(parsedPreview.protocol, 'https:');
assert.ok(parsedPreview.hostname.endsWith('.vercel.app'));

const client = createClient(supabaseUrl, publishableKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const { data: authData, error: authError } = await client.auth.signInWithPassword({ email, password });
assert.ifError(authError);
assert.ok(authData.session?.access_token);

const csv = 'external_id,customer,title,value\npreview-api-1,API zákazník,API test zakázka,64000';
const mapping = {
  external_id: 'ignore',
  customer: 'customerName',
  title: 'title',
  value: 'price',
};
const headers = {
  'content-type': 'application/json',
  authorization: `Bearer ${authData.session.access_token}`,
  ...(previewBypassToken ? { 'x-vercel-protection-bypass': previewBypassToken } : {}),
};
const companyId = 'a0000000-0000-4000-8000-000000000001';

const dryRunResponse = await fetch(new URL('/api/import-leads', previewUrl), {
  method: 'POST', headers, body: JSON.stringify({ mode: 'dry_run', companyId, fileName: 'preview-e2e.csv', csv, mapping }),
});
const dryRun = await dryRunResponse.json();
assert.equal(dryRunResponse.status, 200, JSON.stringify(dryRun));
assert.ok(dryRun.fingerprint);

async function commit() {
  const response = await fetch(new URL('/api/import-leads', previewUrl), {
    method: 'POST', headers,
    body: JSON.stringify({ mode: 'commit', companyId, fileName: 'preview-e2e.csv', csv, mapping, fingerprint: dryRun.fingerprint }),
  });
  const result = await response.json();
  assert.equal(response.status, 200, JSON.stringify(result));
  return result;
}

const first = await commit();
const retry = await commit();
assert.equal(first.imported, true);
assert.equal(first.duplicate, false);
assert.equal(retry.duplicate, true);
assert.equal(first.fingerprint, retry.fingerprint);

console.log(JSON.stringify({
  passed: true,
  dryRunRows: dryRun.rows,
  firstCreated: first.created,
  retryDuplicate: retry.duplicate,
  fingerprint: first.fingerprint,
}));
