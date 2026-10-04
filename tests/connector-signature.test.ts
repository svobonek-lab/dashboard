import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import test from 'node:test';

import { authenticateConnectorRequest, ConnectorRequestError } from '../api/_connector/signature.js';
import { canonicalSigningInput } from '../connector/src/security/identity.js';

const pair = generateKeyPairSync('ed25519');
const publicKey = pair.publicKey.export({ type: 'spki', format: 'pem' }).toString();
const privateKey = pair.privateKey;
const now = new Date('2026-10-04T12:00:00.000Z');
const rawBody = JSON.stringify({ connectorId: 'connector-1', companyId: 'company-1', value: 1 });

function headers(overrides: Record<string, string> = {}) {
  const timestamp = overrides['x-sf-timestamp'] ?? now.toISOString();
  const requestId = overrides['x-sf-request-id'] ?? 'request-1';
  const signature = sign(null, Buffer.from(canonicalSigningInput({ method: 'POST', pathname: '/api/connector-ingest', timestamp, requestId, body: rawBody }), 'utf8'), privateKey).toString('base64');
  return { 'x-sf-connector-id': 'connector-1', 'x-sf-timestamp': timestamp, 'x-sf-request-id': requestId, 'x-sf-signature': signature, ...overrides };
}

const identity = { connectorId: 'connector-1', companyId: 'company-1', publicKey, revoked: false, scopes: ['ingest'] };

test('accepts a valid tenant-bound Ed25519 request once', async () => {
  const reserved: string[] = [];
  const result = await authenticateConnectorRequest({
    method: 'POST', pathname: '/api/connector-ingest', headers: headers(), rawBody,
    body: JSON.parse(rawBody), now, requiredScope: 'ingest', identity,
    reserveNonce: async (_connectorId, requestId) => { reserved.push(requestId); return true; },
  });
  assert.equal(result.companyId, 'company-1');
  assert.deepEqual(reserved, ['request-1']);
});

test('rejects modified body, stale or future timestamps, replay, revoke, scope and tenant mismatch', async () => {
  const cases: Array<Parameters<typeof authenticateConnectorRequest>[0]> = [
    { method: 'POST', pathname: '/api/connector-ingest', headers: headers(), rawBody: `${rawBody} `, body: JSON.parse(rawBody), now, requiredScope: 'ingest', identity, reserveNonce: async () => true },
    { method: 'POST', pathname: '/api/connector-ingest', headers: headers({ 'x-sf-timestamp': '2026-10-04T11:54:59.000Z' }), rawBody, body: JSON.parse(rawBody), now, requiredScope: 'ingest', identity, reserveNonce: async () => true },
    { method: 'POST', pathname: '/api/connector-ingest', headers: headers({ 'x-sf-timestamp': '2026-10-04T12:05:01.000Z' }), rawBody, body: JSON.parse(rawBody), now, requiredScope: 'ingest', identity, reserveNonce: async () => true },
    { method: 'POST', pathname: '/api/connector-ingest', headers: headers(), rawBody, body: JSON.parse(rawBody), now, requiredScope: 'ingest', identity, reserveNonce: async () => false },
    { method: 'POST', pathname: '/api/connector-ingest', headers: headers(), rawBody, body: JSON.parse(rawBody), now, requiredScope: 'ingest', identity: { ...identity, revoked: true }, reserveNonce: async () => true },
    { method: 'POST', pathname: '/api/connector-ingest', headers: headers(), rawBody, body: JSON.parse(rawBody), now, requiredScope: 'commands', identity, reserveNonce: async () => true },
    { method: 'POST', pathname: '/api/connector-ingest', headers: headers(), rawBody, body: { ...JSON.parse(rawBody), companyId: 'company-2' }, now, requiredScope: 'ingest', identity, reserveNonce: async () => true },
  ];
  for (const candidate of cases) await assert.rejects(authenticateConnectorRequest(candidate), ConnectorRequestError);
});

test('external errors never reveal connector existence or signature details', async () => {
  await assert.rejects(authenticateConnectorRequest({
    method: 'POST', pathname: '/api/connector-ingest', headers: headers({ 'x-sf-signature': 'invalid' }), rawBody,
    body: JSON.parse(rawBody), now, requiredScope: 'ingest', identity, reserveNonce: async () => true,
  }), (error: unknown) => {
    assert.ok(error instanceof ConnectorRequestError);
    assert.equal(error.code, 'CONNECTOR_SIGNATURE_INVALID');
    assert.doesNotMatch(error.message, /public|key|connector-1|company-1/i);
    return true;
  });
});
