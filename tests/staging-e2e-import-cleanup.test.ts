import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanupStagingE2eImports } from '../scripts/cleanup-staging-e2e-imports.mjs';

const stagingEnv = {
  STAGING_SUPABASE_URL: 'https://xwzweltjvreqhjpbjrxa.supabase.co',
  STAGING_SUPABASE_PROJECT_REF: 'xwzweltjvreqhjpbjrxa',
  PRODUCTION_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv',
  STAGING_SUPABASE_SERVICE_ROLE_KEY: 'synthetic-test-key',
  STAGING_COMPANY_A_ID: '3a51a21e-5b13-48d1-87e9-a5915b46d37d',
};

test('staging import cleanup refuses production before sending a request', async () => {
  let requests = 0;
  await assert.rejects(
    cleanupStagingE2eImports({ ...stagingEnv, STAGING_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv' }, async () => {
      requests += 1;
      return new Response('[]');
    }),
    /approved staging project/,
  );
  assert.equal(requests, 0);
});

test('cleanup uses the service-only rollback RPC for exact synthetic CSV imports', async () => {
  let rows = [{
    id: '11111111-1111-4111-8111-111111111111',
    company_id: stagingEnv.STAGING_COMPANY_A_ID,
    title: 'StavbaFlow Playwright Import test-run',
    customer: 'Synthetic Playwright Customer',
    import_fingerprint: 'csv_1234abcd',
  }];
  const calls: string[] = [];
  const result = await cleanupStagingE2eImports(stagingEnv, async (input, init) => {
    const url = new URL(String(input));
    calls.push(`${init?.method || 'GET'} ${url.pathname}`);
    if (url.pathname.endsWith('/app_leads')) return new Response(JSON.stringify(rows));
    if (url.pathname.endsWith('/rpc/app_rollback_import')) {
      rows = [];
      return new Response(JSON.stringify({ status: 'rolled_back', deleted: 1 }));
    }
    throw new Error('Unexpected cleanup request.');
  });
  assert.deepEqual(result, { importsRolledBack: 1, rowsRemoved: 1 });
  assert.deepEqual(calls, [
    'GET /rest/v1/app_leads',
    'POST /rest/v1/rpc/app_rollback_import',
    'GET /rest/v1/app_leads',
  ]);
});

test('cleanup refuses a returned row outside the exact synthetic marker', async () => {
  await assert.rejects(
    cleanupStagingE2eImports(stagingEnv, async () => new Response(JSON.stringify([{
      id: '11111111-1111-4111-8111-111111111111',
      company_id: stagingEnv.STAGING_COMPANY_A_ID,
      title: 'Real customer record',
      customer: 'Real Customer',
      import_fingerprint: 'csv_1234abcd',
    }]))),
    /exact synthetic import marker/,
  );
});
