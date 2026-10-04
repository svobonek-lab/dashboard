import assert from 'node:assert/strict';
import test from 'node:test';

import { parseConnectorBody, requirePost } from '../api/_connector/http.js';
import { validateIngestEnvelope } from '../api/_connector/validation.js';

test('connector HTTP boundary rejects method, oversized body and malformed JSON', () => {
  assert.throws(() => requirePost({ method: 'GET' }), /METHOD_NOT_ALLOWED/);
  assert.throws(() => parseConnectorBody({ body: 'x'.repeat(513 * 1024) }), /REQUEST_TOO_LARGE/);
  assert.throws(() => parseConnectorBody({ body: '{bad' }), /REQUEST_INVALID/);
});

test('ingest validation rejects unknown versions, oversized batches and mixed identities', () => {
  const base = { version: 1, connectorId: 'connector-1', companyId: 'company-1', mappingVersion: 1, requestId: 'request-1', dryRun: false, records: [] };
  assert.throws(() => validateIngestEnvelope({ ...base, version: 2 }), /ENVELOPE_INVALID/);
  assert.throws(() => validateIngestEnvelope({ ...base, records: Array.from({ length: 251 }, () => ({})) }), /BATCH_TOO_LARGE/);
  assert.throws(() => validateIngestEnvelope({ ...base, connectorId: 'connector-2' }, { connectorId: 'connector-1', companyId: 'company-1' }), /TENANT_MISMATCH/);
});
