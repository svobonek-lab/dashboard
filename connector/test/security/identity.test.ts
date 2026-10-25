import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { mkdtemp, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { loadIdentity, signRequest, verifyRequest, type SigningRequest } from '../../src/security/identity.js';

const request: SigningRequest = {
  method: 'POST', pathname: '/api/connector/heartbeat', timestamp: '2026-10-25T12:00:00Z', requestId: 'request-1', body: '{"status":"ready"}',
};

test('loads the provisioned HMAC secret from a protected file and signs requests without exposing it', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stavbaflow-identity-'));
  const path = join(directory, 'connector-secret');
  const secret = randomBytes(32).toString('base64url');
  await writeFile(path, `${secret}\n`, { mode: 0o600 });
  const identity = await loadIdentity(path);
  const signed = signRequest(identity, request);

  assert.equal(identity.algorithm, 'HMAC-SHA256');
  assert.equal(verifyRequest(secret, request, signed.signature), true);
  assert.equal(verifyRequest(randomBytes(32).toString('base64url'), request, signed.signature), false);
  if (process.platform !== 'win32') assert.equal((await stat(path)).mode & 0o077, 0);
  assert.doesNotMatch(JSON.stringify(signed), /BEGIN PRIVATE KEY|BEGIN PUBLIC KEY/);
});

test('fails closed on missing, malformed, or legacy asymmetric identity files', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'stavbaflow-identity-'));
  await assert.rejects(loadIdentity(join(directory, 'missing-secret')), /connector secret file is unavailable/);
  const malformedPath = join(directory, 'malformed-secret');
  await writeFile(malformedPath, 'too-short');
  await assert.rejects(loadIdentity(malformedPath), /connector secret file is invalid/);
  const legacyPath = join(directory, 'legacy-identity');
  await writeFile(legacyPath, '-----BEGIN PRIVATE KEY-----legacy');
  await assert.rejects(loadIdentity(legacyPath), /connector secret file is invalid/);
});
