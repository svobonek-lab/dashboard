import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('owner connector contract never exposes source credentials or private keys', async()=>{
  const contract=await readFile(new URL('../src/app/connectorContract.ts',import.meta.url),'utf8');
  assert.doesNotMatch(contract,/password|privateKey|signature|databaseHost/);
  assert.match(contract,/not_configured[\s\S]+revoked/);
  assert.match(contract,/sourceSchema/);
  assert.match(contract,/dryRun/);
});

test('owner APIs use tenant membership and service-only RPC boundaries',async()=>{
  const files=['connector-enroll','connector-status','connector-mapping','connector-command'];
  for(const file of files){const source=await readFile(new URL(`../api/${file}.ts`,import.meta.url),'utf8');assert.match(source,/authorizeConnectorOwner/);assert.match(source,/\.rpc\(/);}
});

test('owner contract exposes an explicit dry-run approval action', async()=>{
  const client=await readFile(new URL('../src/app/connectorClient.ts',import.meta.url),'utf8');
  const command=await readFile(new URL('../api/connector-command.ts',import.meta.url),'utf8');
  assert.match(client,/approveMapping/);
  assert.match(command,/approve_mapping/);
  assert.match(command,/app_approve_connector_mapping/);
});
