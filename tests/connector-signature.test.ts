import assert from 'node:assert/strict';
import { createHash, createHmac, randomBytes } from 'node:crypto';
import test from 'node:test';

import { authenticateConnectorRequest, type StoredConnectorIdentity } from '../api/_connector/signature.js';
import { decryptConnectorSecret, encryptConnectorSecret, fingerprintConnectorSecret } from '../api/_connector/secretVault.js';

const pathname = '/api/connector/heartbeat';
const body = '{"status":"ready"}';
const now = new Date('2026-10-25T12:00:00.000Z');
const secret = randomBytes(32).toString('base64url');

function signedHeaders(key = secret, route = pathname, timestamp = now.toISOString(), requestId = 'request-1') {
  const bodyHash = createHash('sha256').update(body).digest('hex');
  const canonical = ['POST', route, new Date(timestamp).toISOString(), requestId, bodyHash].join('\n');
  const signature = createHmac('sha256', Buffer.from(key, 'base64url')).update(canonical).digest('base64');
  return { 'x-sf-connector-id': 'connector-1', 'x-sf-timestamp': timestamp, 'x-sf-request-id': requestId, 'x-sf-signature': signature };
}

function identity(connectorSecret = secret): StoredConnectorIdentity {
  return { connectorId: 'connector-1', companyId: 'company-1', secret: connectorSecret, revoked: false, scopes: ['heartbeat'] };
}

async function authenticate(headers: Record<string, string>, connectorIdentity = identity(), route = pathname, requestId = 'request-1') {
  return authenticateConnectorRequest({
    method: 'POST', pathname: route, headers, rawBody: body, body: { status: 'ready' }, now, requiredScope: 'heartbeat', identity: connectorIdentity,
    reserveNonce: async (_connectorId, receivedRequestId) => receivedRequestId === requestId,
  });
}

test('HMAC authentication binds the canonical method, path, timestamp, request ID, and body', async () => {
  const headers = signedHeaders();
  assert.equal((await authenticate(headers)).connectorId, 'connector-1');
  await assert.rejects(authenticate(headers, identity(), '/api/connector/ingest'), /CONNECTOR_SIGNATURE_INVALID/);
  await assert.rejects(authenticate(signedHeaders(secret, pathname, now.toISOString(), 'other-request')), /CONNECTOR_REPLAYED/);
  await assert.rejects(authenticate({ ...headers, 'x-sf-signature': Buffer.alloc(16).toString('base64') }), /CONNECTOR_SIGNATURE_INVALID/);
  await assert.rejects(authenticate({ ...headers, 'x-sf-signature': `${headers['x-sf-signature']}!` }), /CONNECTOR_SIGNATURE_INVALID/);
});

test('HMAC authentication rejects stale requests, replay, and the previous rotated secret', async () => {
  const staleTimestamp = '2026-10-25T11:00:00.000Z';
  await assert.rejects(authenticate(signedHeaders(secret, pathname, staleTimestamp)), /CONNECTOR_TIMESTAMP_INVALID/);
  await assert.rejects(authenticate(signedHeaders(secret, pathname, now.toISOString(), 'replayed'), identity(), pathname, 'another-id'), /CONNECTOR_REPLAYED/);
  const rotatedSecret = randomBytes(32).toString('base64url');
  await assert.rejects(authenticate(signedHeaders(secret), identity(rotatedSecret)), /CONNECTOR_SIGNATURE_INVALID/);
  assert.equal((await authenticate(signedHeaders(rotatedSecret), identity(rotatedSecret))).connectorId, 'connector-1');
});

test('connector secrets are encrypted with AES-256-GCM and fail closed on missing or wrong keys', () => {
  const key = randomBytes(32).toString('base64');
  const otherKey = randomBytes(32).toString('base64');
  const encrypted = encryptConnectorSecret(secret, key);
  assert.notEqual(encrypted, secret);
  assert.equal(decryptConnectorSecret(encrypted, key), secret);
  assert.equal(fingerprintConnectorSecret(secret), createHash('sha256').update(Buffer.from(secret, 'base64url')).digest('hex'));
  assert.throws(() => decryptConnectorSecret(encrypted, otherKey), /CONNECTOR_SECRET_DECRYPT_FAILED/);
  assert.throws(() => encryptConnectorSecret(secret, undefined), /CONNECTOR_SECRET_CONFIGURATION_MISSING/);
});
