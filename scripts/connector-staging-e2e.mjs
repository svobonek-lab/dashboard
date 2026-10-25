import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';
import { assertIsolatedStagingProject } from './connector-staging-environment.mjs';

const { stagingUrl } = assertIsolatedStagingProject(process.env);
const publishableKey = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
const previewUrl = process.env.STAGING_PREVIEW_URL;
assert.ok(publishableKey && previewUrl, 'Missing staging acceptance configuration.');
const preview = new URL(previewUrl);
assert.equal(preview.protocol, 'https:');
assert.ok(preview.hostname.endsWith('.vercel.app'), 'Only a reviewed Vercel Preview is accepted.');

function account(prefix) {
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  assert.ok(email && password, `Missing ${prefix} synthetic credentials.`);
  return { email, password };
}
const companyA = 'a0000000-0000-4000-8000-000000000001';
const companyB = 'b0000000-0000-4000-8000-000000000002';
const accounts = { ownerA: account('STAGING_OWNER_A'), employeeA: account('STAGING_EMPLOYEE_A'), ownerB: account('STAGING_OWNER_B') };

async function tokenFor(credentials) {
  const client = createClient(stagingUrl, publishableKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await client.auth.signInWithPassword(credentials);
  assert.ifError(error);
  assert.ok(data.session?.access_token);
  return data.session.access_token;
}

async function connectorStatus(token, companyId) {
  const response = await fetch(new URL('/api/connector/status', preview), {
    method: 'POST',
    headers: {
      authorization: `Bearer ${token}`,
      'content-type': 'application/json',
      ...(process.env.STAGING_PREVIEW_BYPASS_TOKEN ? { 'x-vercel-protection-bypass': process.env.STAGING_PREVIEW_BYPASS_TOKEN } : {}),
    },
    body: JSON.stringify({ companyId }),
  });
  return { status: response.status, body: await response.json() };
}

const [ownerAToken, employeeAToken, ownerBToken] = await Promise.all(Object.values(accounts).map(tokenFor));
const [ownerAOwn, ownerACross, employeeOwn, ownerBOwn] = await Promise.all([
  connectorStatus(ownerAToken, companyA), connectorStatus(ownerAToken, companyB), connectorStatus(employeeAToken, companyA), connectorStatus(ownerBToken, companyB),
]);
assert.equal(ownerAOwn.status, 200, JSON.stringify(ownerAOwn.body));
assert.equal(ownerBOwn.status, 200, JSON.stringify(ownerBOwn.body));
assert.equal(ownerACross.status, 403, 'Owner A must not inspect company B connector state.');
assert.equal(employeeOwn.status, 403, 'Employees must not inspect connector diagnostics.');
assert.ok(Array.isArray(ownerAOwn.body.connectors) && Array.isArray(ownerBOwn.body.connectors));
assert.ok(JSON.stringify(ownerAOwn.body).length < 262144 && JSON.stringify(ownerBOwn.body).length < 262144);

console.log(JSON.stringify({ passed: true, environment: 'isolated-staging', ownerIsolation: true, employeeDenied: true, customerRowsPrinted: false }));
