import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupPublicIntakeLoad } from '../scripts/cleanup-staging-public-load.mjs';

const stagingEnv = {
  STAGING_SUPABASE_URL: 'https://xwzweltjvreqhjpbjrxa.supabase.co',
  STAGING_SUPABASE_PROJECT_REF: 'xwzweltjvreqhjpbjrxa',
  PRODUCTION_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv',
  STAGING_SUPABASE_SERVICE_ROLE_KEY: 'synthetic-test-key',
  STAGING_COMPANY_A_ID: '3a51a21e-5b13-48d1-87e9-a5915b46d37d',
  STAGING_PUBLIC_LOAD_RUN_ID: '41044726790-1',
};

const syntheticRow = (id: string) => ({
  id,
  company_id: stagingEnv.STAGING_COMPANY_A_ID,
  title: `Synthetic public load ${stagingEnv.STAGING_PUBLIC_LOAD_RUN_ID} 1`,
  customer: 'Synthetic Load Customer',
  email: `k6-${stagingEnv.STAGING_PUBLIC_LOAD_RUN_ID}-1@example.invalid`,
  phone: '+420700000000',
  source: 'public_form',
  value: 0,
});

test('public-load cleanup refuses production before sending a request', async () => {
  let requests = 0;
  await assert.rejects(
    cleanupPublicIntakeLoad({ ...stagingEnv, STAGING_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv' }, async () => {
      requests += 1;
      return new Response('[]');
    }),
    /approved staging project/,
  );
  assert.equal(requests, 0);
});

test('public-load cleanup deletes only exactly marked synthetic rows and verifies removal', async () => {
  let rows = [syntheticRow('11111111-1111-4111-8111-111111111111')];
  const calls: Array<{ method: string; pathname: string; query: URLSearchParams }> = [];
  const result = await cleanupPublicIntakeLoad(stagingEnv, async (input, init) => {
    const url = new URL(String(input));
    const method = init?.method || 'GET';
    calls.push({ method, pathname: url.pathname, query: url.searchParams });
    if (url.pathname.endsWith('/app_leads') && method === 'GET') return new Response(JSON.stringify(rows));
    if (url.pathname.endsWith('/app_leads') && method === 'DELETE') {
      const id = url.searchParams.get('id')?.slice(3);
      const deleted = rows.filter(row => row.id === id);
      rows = rows.filter(row => row.id !== id);
      return new Response(JSON.stringify(deleted));
    }
    throw new Error('Unexpected cleanup request.');
  });

  assert.deepEqual(result, { rowsRemoved: 1 });
  assert.deepEqual(calls.map(call => `${call.method} ${call.pathname}`), [
    'GET /rest/v1/app_leads',
    'DELETE /rest/v1/app_leads',
    'GET /rest/v1/app_leads',
  ]);
  assert.equal(calls[0].query.get('company_id'), `eq.${stagingEnv.STAGING_COMPANY_A_ID}`);
  assert.equal(calls[1].query.get('company_id'), `eq.${stagingEnv.STAGING_COMPANY_A_ID}`);
  assert.equal(rows.length, 0);
});

test('public-load cleanup refuses rows with any mismatched synthetic marker', async () => {
  await assert.rejects(
    cleanupPublicIntakeLoad(stagingEnv, async () => new Response(JSON.stringify([{
      ...syntheticRow('11111111-1111-4111-8111-111111111111'),
      customer: 'Real Customer',
    }]))),
    /exact synthetic markers/,
  );
});

test('public-load cleanup refuses malformed run identifiers and wrong company IDs', async () => {
  let requests = 0;
  const noRequest = async () => {
    requests += 1;
    return new Response('[]');
  };
  await assert.rejects(
    cleanupPublicIntakeLoad({ ...stagingEnv, STAGING_PUBLIC_LOAD_RUN_ID: '../other-run' }, noRequest),
    /run identifier/,
  );
  await assert.rejects(
    cleanupPublicIntakeLoad({ ...stagingEnv, STAGING_COMPANY_A_ID: '22222222-2222-4222-8222-222222222222' }, noRequest),
    /not synthetic company A/,
  );
  assert.equal(requests, 0);
});
