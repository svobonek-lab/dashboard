import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { resolveConnectorRoute } from '../api/connector/[route].js';

test('owner connector contract never exposes source credentials or private keys', async()=>{
  const contract=await readFile(new URL('../src/features/manage-integrations/api/connectorContract.ts',import.meta.url),'utf8');
  assert.doesNotMatch(contract,/password|privateKey|signature|databaseHost/);
  assert.match(contract,/not_configured[\s\S]+revoked/);
  assert.match(contract,/sourceSchema/);
  assert.match(contract,/dryRun/);
});

test('owner Playwright login blocks non-staging auth and scopes Preview bypass to Vercel', async()=>{
  const script = await readFile(new URL('../scripts/connector-owner-ui-e2e.mjs', import.meta.url), 'utf8');
  assert.match(script, /context\.route\('\*\*\/\*'/);
  assert.match(script, /expectedStagingOrigin/);
  assert.match(script, /route\.request\(\)\.url\(\)/);
  assert.match(script, /url\.origin !== expectedStagingOrigin/);
  assert.match(script, /url\.origin === previewUrl\.origin/);
  assert.match(script, /NO_ACTIVE_MEMBERSHIP/);
});

test('owner APIs use tenant membership and service-only RPC boundaries',async()=>{
  const files=['enroll','status','mapping','command'];
  for(const file of files){const source=await readFile(new URL(`../api/_connector/routes/${file}.ts`,import.meta.url),'utf8');assert.match(source,/authorizeConnectorOwner/);assert.match(source,/\.rpc\(/);}
});

test('owner contract exposes an explicit dry-run approval action', async()=>{
  const client=await readFile(new URL('../src/features/manage-integrations/api/connectorClient.ts',import.meta.url),'utf8');
  const command=await readFile(new URL('../api/_connector/routes/command.ts',import.meta.url),'utf8');
  assert.match(client,/approveMapping/);
  assert.match(command,/approve_mapping/);
  assert.match(command,/app_approve_connector_mapping/);
});

test('BYODB operations route is explicitly registered and keeps user, connector, and release boundaries', async()=>{
  assert.equal(typeof resolveConnectorRoute('operations'), 'function');
  assert.equal(resolveConnectorRoute('../operations'), undefined);
  const route = await readFile(new URL('../api/_connector/routes/operations.ts', import.meta.url), 'utf8');
  assert.match(route, /authorizeConnectorMember/);
  assert.match(route, /authenticateConnectorHttpRequest\(request, '\/api\/connector\/operations', 'operations'\)/);
  assert.match(route, /requireByodbReleaseGate\(\)/);
  assert.match(route, /app_create_byodb_operation/);
  assert.match(route, /validateByodbPollBatch/);
});

test('BYODB cloud reads are tenant-authorized, employee-scoped, and return only mapped projection data', async()=>{
  const route = await readFile(new URL('../api/_connector/routes/operations.ts', import.meta.url), 'utf8');
  assert.match(route, /action === 'context'/);
  assert.match(route, /action === 'records'/);
  assert.match(route, /authorizeConnectorMember/);
  assert.match(route, /app_get_byodb_context/);
  assert.match(route, /app_list_byodb_records/);
  assert.match(route, /app_set_company_database_mode/);
  assert.doesNotMatch(route, /databaseHost|connectionString|secret_ciphertext|passwordFile/i);
});

test('connector dispatches each server-approved operation with its attached map even when active sync map differs', async () => {
  const runtime = await readFile(new URL('../connector/src/runtimeBootstrap.ts', import.meta.url), 'utf8');
  assert.match(runtime, /if \(config\.database\.writeUsername\)[\s\S]+pollOperations\(\)[\s\S]+processByodbOperations\(operations, activeMapping/);
  assert.doesNotMatch(runtime, /if \(config\.database\.writeUsername && engine && await engine\.mappingApproved\(\)\)/);
});

test('personalized connector registration is pinned to the expected company id', async () => {
  const runtime = await readFile(new URL('../connector/src/runtimeBootstrap.ts', import.meta.url), 'utf8');
  assert.match(runtime, /config\.expectedCompanyId[\s\S]+registration\.companyId[\s\S]+throw new Error\('connector enrollment belongs to a different company'\)/);
});
