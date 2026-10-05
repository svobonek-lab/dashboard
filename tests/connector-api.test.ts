import assert from 'node:assert/strict';
import test from 'node:test';

import { parseConnectorBody, requirePost } from '../api/_connector/http.js';
import { validateConnectorMapping, validateIngestEnvelope, validateRunMetrics, validateSourceSchema } from '../api/_connector/validation.js';

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

test('dry run requires count-consistent value-free issue metadata', () => {
  const base = { version: 1, connectorId: 'connector-1', companyId: 'company-1', mappingVersion: 1, requestId: 'request-1', dryRun: true, records: [] };
  assert.throws(() => validateIngestEnvelope(base), /DRY_RUN_SUMMARY_INVALID/);
  assert.throws(() => validateIngestEnvelope({ ...base, dryRunSummary: { total: 1, valid: 0, failed: 1, issues: [{ code: 'CONVERSION_INVALID', sourceColumn: 'email', value: 'customer@example.test' }] } }), /DRY_RUN_SUMMARY_INVALID/);
  assert.equal(validateIngestEnvelope({ ...base, dryRunSummary: { total: 1, valid: 0, failed: 1, issues: [{ code: 'CONVERSION_INVALID', sourceColumn: 'email', targetField: 'email' }] } }).dryRunSummary?.failed, 1);
});

test('mapping accepts only columns reported by the connector schema', () => {
  const sourceSchema = validateSourceSchema({ tables: [{ schema: 'public', name: 'leads', columns: [
    { name: 'id', dataType: 'uuid', nullable: false },
    { name: 'title', dataType: 'text', nullable: false },
  ] }] });
  const mapping = { version: 1, mappingVersion: 1, entityType: 'lead', sourceSystem: 'customer-db', schema: 'public', table: 'leads', externalIdColumn: 'id', fields: [{ sourceColumn: 'title', targetField: 'title', conversion: { kind: 'text' }, required: true }] };
  assert.equal(validateConnectorMapping(mapping, sourceSchema).fields[0]?.sourceColumn, 'title');
  assert.throws(() => validateConnectorMapping({ ...mapping, externalIdColumn: 'missing' }, sourceSchema), /MAPPING_SOURCE_UNKNOWN/);
});

test('mapping rejects unbounded conversion options and secret-like enum values', () => {
  const schema = { tables: [{ schema: 'public', name: 'leads', columns: [{ name: 'id', dataType: 'uuid', nullable: false }, { name: 'status', dataType: 'text', nullable: true }] }] };
  const mapping = { version: 1, mappingVersion: 1, entityType: 'lead', sourceSystem: 'pilot', schema: 'public', table: 'leads', externalIdColumn: 'id', fields: [{ sourceColumn: 'status', targetField: 'status', conversion: { kind: 'enum', values: { password: 'secret-value' } } }] };
  assert.throws(() => validateConnectorMapping(mapping, schema), /MAPPING_INVALID/);
  assert.throws(() => validateConnectorMapping({ ...mapping, fields: [{ sourceColumn: 'status', targetField: 'status', conversion: { kind: 'text', arbitrary: true } }] }, schema), /MAPPING_INVALID/);
});

test('heartbeat metrics cannot carry arbitrary source values', () => {
  assert.deepEqual(validateRunMetrics({ completedAt: '2026-10-05T08:00:00Z', processed: 12, changed: 2, failed: 1 }), { completedAt: '2026-10-05T08:00:00.000Z', processed: 12, changed: 2, failed: 1 });
  assert.throws(() => validateRunMetrics({ completedAt: '2026-10-05T08:00:00Z', processed: 1, changed: 1, failed: 0, sampleRow: { name: 'customer' } }), /RUN_METRICS_INVALID/);
});
