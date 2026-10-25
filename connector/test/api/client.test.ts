import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { ConnectorApi, ConnectorApiError } from '../../src/api/client.js';
import { loadConnectorConfig, parseConnectorConfig } from '../../src/config.js';
import { fingerprintSecret, loadIdentity, verifyRequest } from '../../src/security/identity.js';

async function testIdentity(path: string) {
  const secret = randomBytes(32).toString('base64url');
  await writeFile(path, `${secret}\n`, { mode: 0o600 });
  return loadIdentity(path);
}

test('signs canonical requests and retries only transient responses', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stavbaflow-client-'));
  const identity = await testIdentity(join(directory, 'identity.json'));
  let attempts = 0;
  const fetcher: typeof fetch = async (input, init) => {
    attempts++;
    if (attempts === 1) return new Response(JSON.stringify({ code: 'BUSY' }), { status: 503, headers: { 'content-type': 'application/json' } });
    const url = new URL(String(input));
    const headers = new Headers(init?.headers);
    const body = String(init?.body ?? '');
    assert.equal(verifyRequest(identity.secret, {
      method: 'POST', pathname: url.pathname, timestamp: headers.get('x-sf-timestamp')!, requestId: headers.get('x-sf-request-id')!, body,
    }, headers.get('x-sf-signature')!), true);
    return new Response(JSON.stringify({ version: 1, requestId: 'request-1', accepted: true, results: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  const api = new ConnectorApi({ baseUrl: 'https://app.example.test', connectorId: 'connector-1', identity, fetcher, sleep: async () => undefined });
  const ack = await api.ingest({ version: 1, connectorId: 'connector-1', companyId: 'company-1', mappingVersion: 1, requestId: 'request-1', dryRun: false, records: [] });
  assert.equal(ack.accepted, true);
  assert.equal(attempts, 2);
});

test('enrollment returns the server-bound connector and company identities', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stavbaflow-client-'));
  const identity = await testIdentity(join(directory, 'identity.json'));
  const secretFingerprint = fingerprintSecret(identity.secret);
  const api = new ConnectorApi({
    baseUrl: 'https://app.example.test', identity,
    fetcher: async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>;
      assert.equal(body.secretFingerprint, secretFingerprint);
      assert.equal('publicKey' in body, false);
      return new Response(JSON.stringify({ connectorId: 'connector-1', companyId: 'company-1' }), { status: 200 });
    },
  });
  assert.deepEqual(await api.enroll('one-time-code'), { connectorId: 'connector-1', companyId: 'company-1' });
});

test('does not retry authorization failures or expose response details', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stavbaflow-client-'));
  const identity = await testIdentity(join(directory, 'identity.json'));
  let attempts = 0;
  const api = new ConnectorApi({
    baseUrl: 'https://app.example.test', connectorId: 'connector-1', identity,
    fetcher: async () => { attempts++; return new Response(JSON.stringify({ error: 'database internals and customer row', code: 'CONNECTOR_REVOKED' }), { status: 401 }); },
    sleep: async () => undefined,
  });
  await assert.rejects(api.heartbeat({ status: 'ready', version: '0.1.0' }), (error: unknown) => {
    assert.ok(error instanceof ConnectorApiError);
    assert.equal(error.code, 'CONNECTOR_REVOKED');
    assert.doesNotMatch(error.message, /database internals|customer row/);
    return true;
  });
  assert.equal(attempts, 1);
});

test('rejects oversized bodies and expired commands', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stavbaflow-client-'));
  const identity = await testIdentity(join(directory, 'identity.json'));
  const api = new ConnectorApi({
    baseUrl: 'https://app.example.test', connectorId: 'connector-1', identity, maxBodyBytes: 120,
    fetcher: async (_input, init) => String(init?.body).includes('records')
      ? new Response('{}', { status: 200 })
      : new Response(JSON.stringify({ commands: [{ version: 1, id: 'old', connectorId: 'connector-1', type: 'sync_now', expiresAt: '2020-01-01T00:00:00Z' }] }), { status: 200 }),
  });
  await assert.rejects(api.ingest({ version: 1, connectorId: 'connector-1', companyId: 'company-1', mappingVersion: 1, requestId: 'large', dryRun: false, records: [], padding: 'x'.repeat(200) } as never), /body exceeds/);
  assert.deepEqual(await api.pollCommands(new Date('2026-10-04T10:00:00Z')), []);
});

test('rejects malformed or cross-connector command responses before dispatch', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stavbaflow-client-'));
  const identity = await testIdentity(join(directory, 'identity.json'));
  const api = new ConnectorApi({
    baseUrl: 'https://app.example.test', connectorId: 'connector-1', identity,
    fetcher: async () => new Response(JSON.stringify({ commands: [{ version: 1, id: 'cross', connectorId: 'connector-2', type: 'sync_now', expiresAt: '2026-10-05T12:00:00Z' }] }), { status: 200 }),
  });
  await assert.rejects(api.pollCommands(new Date('2026-10-05T10:00:00Z')), /command response is invalid/);
});

test('strict config reads password from a file and rejects unsafe paths and unknown keys', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stavbaflow-config-'));
  const passwordPath = join(root, 'db-password');
  const configPath = join(root, 'config.json');
  await writeFile(passwordPath, 'file-secret\n');
  const writePasswordPath = join(root, 'db-write-password');
  await writeFile(writePasswordPath, 'write-file-secret\n');
  await writeFile(configPath, JSON.stringify({
    apiBaseUrl: 'https://app.example.test', stateRoot: root, identityPath: join(root, 'identity.json'), mappingPath: join(root, 'mapping.json'),
    syncIntervalSeconds: 60, database: { driver: 'postgres', host: 'db.local', port: 5432, database: 'fixture', username: 'reader', passwordFile: passwordPath, writeUsername: 'writer', writePasswordFile: writePasswordPath },
  }));
  assert.equal((await loadConnectorConfig(configPath)).database.password, 'file-secret');
  assert.equal((await loadConnectorConfig(configPath)).database.writePassword, 'write-file-secret');
  assert.throws(() => parseConnectorConfig({ apiBaseUrl: 'https://app.example.test', stateRoot: root, identityPath: join(root, 'identity'), mappingPath: join(root, 'mapping'), syncIntervalSeconds: 60, database: { driver: 'postgres', host: 'db', port: 5432, database: 'x', username: 'reader', passwordFile: passwordPath, writeUsername: 'writer' } }), /configured together/);
  assert.throws(() => parseConnectorConfig({ apiBaseUrl: 'http://public.example.test', stateRoot: root, identityPath: join(root, 'identity'), mappingPath: join(root, 'mapping'), syncIntervalSeconds: 59, database: {}, extra: true }), /unknown config key: extra/);
  assert.throws(() => parseConnectorConfig({ apiBaseUrl: 'https://app.example.test', stateRoot: './relative', identityPath: join(root, 'identity'), mappingPath: join(root, 'mapping'), syncIntervalSeconds: 60, database: { driver: 'postgres', host: 'db', port: 5432, database: 'x', username: 'x', passwordFile: passwordPath } }), /stateRoot must be absolute/);
  assert.throws(() => parseConnectorConfig({ apiBaseUrl: 'https://app.example.test', stateRoot: root, identityPath: 'C:/outside/identity', mappingPath: join(root, 'mapping'), syncIntervalSeconds: 60, database: { driver: 'postgres', host: 'db', port: 5432, database: 'x', username: 'x', passwordFile: passwordPath } }), /inside stateRoot/);
  assert.throws(() => parseConnectorConfig({ apiBaseUrl: 'https://app.example.test', stateRoot: root, identityPath: join(root, 'identity'), mappingPath: 'C:/outside/mapping.json', syncIntervalSeconds: 60, database: { driver: 'postgres', host: 'db', port: 5432, database: 'x', username: 'x', passwordFile: passwordPath } }), /mappingPath must be inside stateRoot/);
});

test('Synology DB_HOST and DB_PORT override only the database endpoint', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stavbaflow-synology-config-'));
  const passwordPath = join(root, 'db-password');
  const configPath = join(root, 'config.json');
  await writeFile(passwordPath, 'fixture-password\n');
  await writeFile(configPath, JSON.stringify({
    apiBaseUrl: 'https://app.example.test', stateRoot: root,
    identityPath: join(root, 'identity.json'), mappingPath: join(root, 'mapping.json'),
    syncIntervalSeconds: 60,
    database: { driver: 'mariadb', host: 'placeholder', port: 3306, database: 'fixture', username: 'reader', passwordFile: passwordPath },
  }));
  const previousHost = process.env.DB_HOST;
  const previousPort = process.env.DB_PORT;
  try {
    process.env.DB_HOST = '192.168.1.20';
    process.env.DB_PORT = '3307';
    const config = await loadConnectorConfig(configPath);
    assert.equal(config.database.driver, 'mariadb');
    assert.equal(config.database.host, '192.168.1.20');
    assert.equal(config.database.port, 3307);
    process.env.DB_PORT = 'invalid';
    await assert.rejects(loadConnectorConfig(configPath), /database port is invalid/);
  } finally {
    if (previousHost === undefined) delete process.env.DB_HOST;
    else process.env.DB_HOST = previousHost;
    if (previousPort === undefined) delete process.env.DB_PORT;
    else process.env.DB_PORT = previousPort;
  }
});
test('every network attempt has an abort deadline and retries preserve the batch request id', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sf-timeout-'));
  const identity = await testIdentity(join(root, 'identity.json'));
  let attempts = 0;
  const delays: number[] = [];
  const signals: unknown[] = [];
  const requestIds: (string | null)[] = [];
  const api = new ConnectorApi({
    baseUrl: 'https://app.example.test', connectorId: 'connector-1', identity,
    sleep: async ms => { delays.push(ms); },
    fetcher: async (_input, init) => {
      attempts++;
      signals.push(init?.signal);
      requestIds.push(new Headers(init?.headers).get('x-sf-request-id'));
      throw new Error('connection lost');
    },
  });
  await assert.rejects(api.ingest({
    version: 1, connectorId: 'connector-1', companyId: 'company-1',
    mappingVersion: 1, requestId: 'durable-request', dryRun: false, records: [],
  }), /CONNECTOR_NETWORK_UNAVAILABLE/);
  assert.equal(attempts, 3);
  assert.deepEqual(delays, [250, 500]);
  assert.ok(signals.every(signal => signal instanceof AbortSignal), 'every attempt needs an abort deadline');
  assert.deepEqual(requestIds, ['durable-request', 'durable-request', 'durable-request']);
});
test('ingest does not retire a batch on HTTP 201 or 202 even with accepted=true',async()=>{
 const root=await mkdtemp(join(tmpdir(),'sf-ack-status-'));
 const identity=await testIdentity(join(root,'identity.json'));
 for(const status of [201,202]){
  const api=new ConnectorApi({baseUrl:'https://app.example.test',connectorId:'connector-1',identity,
   fetcher:async()=>new Response(JSON.stringify({accepted:true,requestId:'status-test',results:[]}),{status}),
  });
  await assert.rejects(api.ingest({version:1,connectorId:'connector-1',companyId:'company-1',mappingVersion:1,requestId:'status-test',dryRun:false,records:[]}),/CONNECTOR_ACK_STATUS_INVALID/);
 }
});
