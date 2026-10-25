import assert from 'node:assert/strict';
import test from 'node:test';

import { parseConnectorBody, requirePost } from '../api/_connector/http.js';
import { validateByodbOperationAck, validateByodbOperationCreate, validateByodbOperationRequest, validateByodbPollBatch, validateConnectorDatabaseMode, validateConnectorMapping, validateConnectorRegistration, validateIngestEnvelope, validateRunMetrics, validateSourceSchema } from '../api/_connector/validation.js';

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

test('ingest Zod boundary rejects malformed canonical records before persistence', () => {
  const base = { version: 1, connectorId: 'connector-1', companyId: 'company-1', mappingVersion: 1, requestId: 'request-1', dryRun: false };
  const record = {
    version: 1, type: 'customer', sourceSystem: 'fixture', sourceTable: 'customers', externalId: '1',
    fingerprint: 'a'.repeat(64), payload: { name: 'Test' },
  };
  assert.equal(validateIngestEnvelope({ ...base, records: [record] }).records.length, 1);
  assert.throws(() => validateIngestEnvelope({ ...base, records: [{ ...record, payload: { name: 'Test', hidden: 'secret' } }] }), /unknown field/);
  assert.throws(() => validateIngestEnvelope({ ...base, records: [{ ...record, externalId: 1 }] }), /ENVELOPE_INVALID/);
  assert.throws(() => validateIngestEnvelope({ ...base, records: [{ ...record, payload: { name: 'Test', archived: { unexpected: undefined } } }] }), /ENVELOPE_INVALID/);
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

test('source schema contract preserves key, identity, and default metadata required to gate safe creates', () => {
  const schema = validateSourceSchema({ tables: [{ schema: 'public', name: 'leads', columns: [
    { name: 'id', dataType: 'uuid', nullable: false, primaryKey: true, generated: false, hasDefault: false },
  ] }] });
  assert.deepEqual(schema.tables[0]?.columns[0], { name: 'id', dataType: 'uuid', nullable: false, primaryKey: true, generated: false, hasDefault: false });
  assert.throws(() => validateSourceSchema({ tables: [{ schema: 'public', name: 'leads', columns: [{ name: 'id', dataType: 'uuid', nullable: false, generated: 'yes' }] }] }), /SOURCE_SCHEMA_INVALID/);
});

test('mapping rejects unbounded conversion options and secret-like enum values', () => {
  const schema = { tables: [{ schema: 'public', name: 'leads', columns: [{ name: 'id', dataType: 'uuid', nullable: false }, { name: 'status', dataType: 'text', nullable: true }] }] };
  const mapping = { version: 1, mappingVersion: 1, entityType: 'lead', sourceSystem: 'pilot', schema: 'public', table: 'leads', externalIdColumn: 'id', fields: [{ sourceColumn: 'status', targetField: 'status', conversion: { kind: 'enum', values: { password: 'secret-value' } } }] };
  assert.throws(() => validateConnectorMapping(mapping, schema), /MAPPING_INVALID/);
  assert.throws(() => validateConnectorMapping({ ...mapping, fields: [{ sourceColumn: 'status', targetField: 'status', conversion: { kind: 'text', arbitrary: true } }] }, schema), /MAPPING_INVALID/);
});

test('BYODB mappings allow canonical company and lead fields while rejecting duplicates and unknown targets', () => {
  const sourceSchema = validateSourceSchema({ tables: [{ schema: 'public', name: 'crm', columns: [
    { name: 'id', dataType: 'uuid', nullable: false },
    { name: 'firma_nazev', dataType: 'text', nullable: false },
    { name: 'kontakt_email', dataType: 'text', nullable: true },
    { name: 'zakazka_stav', dataType: 'text', nullable: true },
    { name: 'assigned_email', dataType: 'text', nullable: true },
  ] }] });
  const base = { version: 1, mappingVersion: 1, sourceSystem: 'customer-db', schema: 'public', table: 'crm', externalIdColumn: 'id' };

  const company = validateConnectorMapping({ ...base, entityType: 'company', fields: [
    { sourceColumn: 'firma_nazev', targetField: 'name', conversion: { kind: 'text' }, required: true },
  ] }, sourceSchema);
  assert.equal(company.entityType, 'company');
  assert.equal(company.fields[0]?.targetField, 'name');

  const lead = validateConnectorMapping({ ...base, entityType: 'lead', fields: [
    { sourceColumn: 'kontakt_email', targetField: 'email', conversion: { kind: 'email' } },
    { sourceColumn: 'zakazka_stav', targetField: 'status', conversion: { kind: 'text' } },
    { sourceColumn: 'assigned_email', targetField: 'assignedToEmail', conversion: { kind: 'email' } },
  ] }, sourceSchema);
  assert.deepEqual(lead.fields.map(field => field.targetField), ['email', 'status', 'assignedToEmail']);
  assert.throws(() => validateConnectorMapping({ ...base, entityType: 'lead', fields: [
    { sourceColumn: 'kontakt_email', targetField: 'email', conversion: { kind: 'email' } },
    { sourceColumn: 'zakazka_stav', targetField: 'email', conversion: { kind: 'text' } },
  ] }, sourceSchema), /MAPPING_INVALID/);
  assert.throws(() => validateConnectorMapping({ ...base, entityType: 'company', fields: [
    { sourceColumn: 'firma_nazev', targetField: 'password', conversion: { kind: 'text' } },
  ] }, sourceSchema), /MAPPING_INVALID/);
});

test('BYODB mapping cannot select secret-like source columns', () => {
  const sourceSchema = validateSourceSchema({ tables: [{ schema: 'public', name: 'crm', columns: [
    { name: 'id', dataType: 'uuid', nullable: false },
    { name: 'api_token', dataType: 'text', nullable: true },
  ] }] });
  assert.throws(() => validateConnectorMapping({
    version: 1, mappingVersion: 1, entityType: 'company', sourceSystem: 'customer-db', schema: 'public', table: 'crm', externalIdColumn: 'id',
    fields: [{ sourceColumn: 'api_token', targetField: 'name', conversion: { kind: 'text' } }],
  }, sourceSchema), /MAPPING_INVALID/);
});

test('connector database mode is versioned, strict, and requires a driver only for BYODB', () => {
  assert.deepEqual(validateConnectorDatabaseMode({ version: 1, mode: 'managed_cloud' }), { version: 1, mode: 'managed_cloud' });
  assert.deepEqual(validateConnectorDatabaseMode({ version: 1, mode: 'byodb', driver: 'mariadb' }), { version: 1, mode: 'byodb', driver: 'mariadb' });
  assert.throws(() => validateConnectorDatabaseMode({ version: 1, mode: 'byodb' }), /DATABASE_MODE_INVALID/);
  assert.throws(() => validateConnectorDatabaseMode({ version: 1, mode: 'managed_cloud', driver: 'postgres' }), /DATABASE_MODE_INVALID/);
  assert.throws(() => validateConnectorDatabaseMode({ version: 1, mode: 'byodb', driver: 'postgres', companyId: 'spoofed' }), /DATABASE_MODE_INVALID/);
});

test('connector registration accepts only an expiring enrollment code and HMAC secret fingerprint', () => {
  const fingerprint = 'a'.repeat(64);
  assert.deepEqual(validateConnectorRegistration({ enrollmentCode: 'a'.repeat(32), secretFingerprint: fingerprint }), {
    enrollmentCode: 'a'.repeat(32), secretFingerprint: fingerprint,
  });
  assert.throws(() => validateConnectorRegistration({ enrollmentCode: 'a'.repeat(32), secretFingerprint: fingerprint, publicKey: 'legacy-key' }), /CONNECTOR_REGISTRATION_INVALID/);
  assert.throws(() => validateConnectorRegistration({ enrollmentCode: 'a'.repeat(32), secretFingerprint: 'weak' }), /CONNECTOR_REGISTRATION_INVALID/);
});

test('BYODB operations are bounded by the approved mapping and role-specific write scope', () => {
  const mapping = { version: 1 as const, mappingVersion: 4, entityType: 'lead' as const, sourceSystem: 'fixture', schema: 'public', table: 'leads', externalIdColumn: 'id', fields: [
    { sourceColumn: 'status', targetField: 'status', conversion: { kind: 'text' as const } },
    { sourceColumn: 'assigned_email', targetField: 'assignedToEmail', conversion: { kind: 'email' as const } },
  ] };
  const base = { version: 1, idempotencyKey: 'b6b2a8fc-2f0b-45df-9aa9-1578f58c86f0', mappingVersion: 4, entityType: 'lead', action: 'update', externalId: 'lead-123', expectedSourceVersion: 'a'.repeat(64), payload: { status: 'in_progress' } };
  const employee = validateByodbOperationCreate(base, 'employee', mapping);
  assert.equal(employee.entityType, 'lead');
  assert.deepEqual(employee.payload, { status: 'in_progress' });
  assert.throws(() => validateByodbOperationCreate({ ...base, action: 'delete', payload: {} }, 'employee', mapping), /OPERATION_ROLE_DENIED/);
  assert.throws(() => validateByodbOperationCreate({ ...base, payload: { status: 'in_progress', title: 'tampered' } }, 'employee', mapping), /OPERATION_MAPPING_INVALID/);
  assert.throws(() => validateByodbOperationCreate({ ...base, mappingVersion: 3 }, 'owner', mapping), /MAPPING_VERSION_STALE/);
  assert.throws(() => validateByodbOperationCreate({ ...base, expectedSourceVersion: null, action: 'update' }, 'owner', mapping), /OPERATION_INVALID/);
  assert.throws(() => validateByodbOperationCreate(base, 'employee', { ...mapping, fields: [mapping.fields[0]] }), /EMPLOYEE_ASSIGNMENT_MAPPING_REQUIRED/);
});

test('BYODB operation acknowledgements accept only bounded terminal outcomes', () => {
  assert.deepEqual(validateByodbOperationAck({ operationId: 'b6b2a8fc-2f0b-45df-9aa9-1578f58c86f0', status: 'applied', sourceVersion: 'b'.repeat(64) }), {
    operationId: 'b6b2a8fc-2f0b-45df-9aa9-1578f58c86f0', status: 'applied', sourceVersion: 'b'.repeat(64),
  });
  assert.deepEqual(validateByodbOperationAck({ operationId: 'b6b2a8fc-2f0b-45df-9aa9-1578f58c86f0', status: 'conflict', errorCode: 'SOURCE_CONFLICT' }).status, 'conflict');
  assert.throws(() => validateByodbOperationAck({ operationId: 'b6b2a8fc-2f0b-45df-9aa9-1578f58c86f0', status: 'failed', errorCode: 'DATABASE_PASSWORD', detail: 'secret' }), /OPERATION_ACK_INVALID/);
  assert.throws(() => validateByodbOperationAck({ operationId: 'b6b2a8fc-2f0b-45df-9aa9-1578f58c86f0', status: 'conflict', errorCode: 'SOURCE_CONFLICT', projection: { secret: 'not a record' } }), /OPERATION_ACK_INVALID/);
});

test('BYODB poll responses are strictly validated and cannot carry undeclared source data', () => {
  const operation = {
    operationId: 'b6b2a8fc-2f0b-45df-9aa9-1578f58c86f0',
    idempotencyKey: 'c7b2a8fc-2f0b-45df-9aa9-1578f58c86f0',
    mappingVersion: 4,
    entityType: 'lead', action: 'update', externalId: 'lead-123',
    expectedSourceVersion: 'a'.repeat(64), payload: { status: 'in_progress' },
    actorRole: 'employee', actorEmail: 'worker@example.test',
  };
  assert.deepEqual(validateByodbPollBatch([operation]), [operation]);
  assert.throws(() => validateByodbPollBatch([{ ...operation, connectionString: 'secret' }]), /OPERATION_RESPONSE_INVALID/);
  assert.throws(() => validateByodbPollBatch([{ ...operation, payload: { password: 'secret' } }]), /OPERATION_RESPONSE_INVALID/);
  assert.throws(() => validateByodbPollBatch([{ ...operation, actorEmail: 'not-an-email' }]), /OPERATION_RESPONSE_INVALID/);
  assert.throws(() => validateByodbPollBatch(Array.from({ length: 51 }, () => operation)), /OPERATION_RESPONSE_INVALID/);
});

test('BYODB operation requests keep tenant IDs on owner actions and derive connector scope for poll and ack', () => {
  const companyId = '8123e456-e89b-42d3-a456-426614174000';
  const connectorId = '9123e456-e89b-42d3-a456-426614174000';
  assert.deepEqual(validateByodbOperationRequest({ action: 'create', companyId, connectorId, operation: {} }), { action: 'create', companyId, connectorId, operation: {} });
  assert.deepEqual(validateByodbOperationRequest({ action: 'list', companyId, limit: 20 }), { action: 'list', companyId, limit: 20 });
  assert.deepEqual(validateByodbOperationRequest({ action: 'poll', limit: 10 }), { action: 'poll', limit: 10 });
  assert.throws(() => validateByodbOperationRequest({ action: 'poll', companyId, limit: 10 }), /OPERATION_REQUEST_INVALID/);
  assert.throws(() => validateByodbOperationRequest({ action: 'create', companyId, connectorId, userId: 'spoofed', operation: {} }), /OPERATION_REQUEST_INVALID/);
});

test('heartbeat metrics cannot carry arbitrary source values', () => {
  assert.deepEqual(validateRunMetrics({ completedAt: '2026-10-05T08:00:00Z', processed: 12, changed: 2, failed: 1 }), { completedAt: '2026-10-05T08:00:00.000Z', processed: 12, changed: 2, failed: 1 });
  assert.throws(() => validateRunMetrics({ completedAt: '2026-10-05T08:00:00Z', processed: 1, changed: 1, failed: 0, sampleRow: { name: 'customer' } }), /RUN_METRICS_INVALID/);
});
