import assert from 'node:assert/strict';
import { mkdtemp, readFile, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import {
  loadOrCreateIdentity,
  signRequest,
  verifyRequest,
  type SigningRequest,
} from '../../src/security/identity.js';

const requestFixture: SigningRequest = {
  method: 'POST',
  pathname: '/api/connector-ingest',
  timestamp: '2026-10-04T10:00:00.000Z',
  requestId: 'request-1',
  body: '{"version":1}',
};

test('persists a private key with owner-only permissions and verifies signatures', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stavbaflow-identity-'));
  const path = join(directory, 'identity.json');
  const identity = await loadOrCreateIdentity(path);
  const signed = signRequest(identity, requestFixture);

  assert.equal(verifyRequest(identity.publicKey, requestFixture, signed.signature), true);
  if (process.platform !== 'win32') assert.equal((await stat(path)).mode & 0o077, 0);
  assert.doesNotMatch(JSON.stringify(signed), /PRIVATE KEY/);
});

test('loads the same identity and rejects a modified request', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stavbaflow-identity-'));
  const path = join(directory, 'identity.json');
  const first = await loadOrCreateIdentity(path);
  const second = await loadOrCreateIdentity(path);
  const signed = signRequest(first, requestFixture);

  assert.equal(second.publicKey, first.publicKey);
  assert.equal(verifyRequest(second.publicKey, { ...requestFixture, body: '{"version":2}' }, signed.signature), false);
  assert.match(await readFile(path, 'utf8'), /PRIVATE KEY/);
});
