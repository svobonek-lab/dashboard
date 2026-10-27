import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';

import { parseConnectorBody, requirePost } from '../api/_connector/http.js';
import { registerConnector, recordConnectorHeartbeat, ingestConnectorBatch } from '../api/_connector/lifecycle.js';
import { authenticateConnectorRequest, type StoredConnectorIdentity } from '../api/_connector/signature.js';
import { contextResponse, projectionRecords } from '../api/_connector/routes/operations.js';
import { validateByodbOperationAck, validateByodbOperationCreate, validateByodbOperationRequest, validateByodbPollBatch, validateConnectorDatabaseMode, validateConnectorMapping, validateConnectorRegistration, validateIngestEnvelope, validateRunMetrics, validateSourceSchema } from '../api/_connector/validation.js';
import { ConnectorApi, type ConnectorApiOptions } from '../connector/src/api/client.js';

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

test('BYODB note and file mappings require their source-of-truth fields', () => {
  const columns = ['id', 'lead_id', 'body', 'author_email', 'created_at', 'object_path', 'file_name', 'mime_type', 'size_bytes', 'sha256'];
  const schema = validateSourceSchema({ tables: [{ schema: 'public', name: 'attachments', columns: columns.map(name => ({ name, dataType: 'text', nullable: false })) }] });
  const base = { version: 1, mappingVersion: 1, sourceSystem: 'customer-db', schema: 'public', table: 'attachments', externalIdColumn: 'id' };
  const rule = (sourceColumn: string, targetField: string) => ({ sourceColumn, targetField, conversion: { kind: 'text' } });
  const noteFields = [rule('lead_id', 'leadExternalId'), rule('body', 'body'), rule('author_email', 'authorEmail'), rule('created_at', 'createdAt')];
  assert.equal(validateConnectorMapping({ ...base, entityType: 'lead_note', fields: noteFields }, schema).entityType, 'lead_note');
  assert.throws(() => validateConnectorMapping({ ...base, entityType: 'lead_note', fields: noteFields.slice(1) }, schema), /MAPPING_REQUIRED_FIELD_MISSING/);
  const fileFields = [rule('lead_id', 'leadExternalId'), rule('object_path', 'objectPath'), rule('file_name', 'fileName'), rule('mime_type', 'mimeType'), rule('size_bytes', 'sizeBytes'), rule('sha256', 'sha256')];
  assert.equal(validateConnectorMapping({ ...base, entityType: 'lead_file', fields: fileFields }, schema).entityType, 'lead_file');
  assert.throws(() => validateConnectorMapping({ ...base, entityType: 'lead_file', fields: fileFields.slice(0, -1) }, schema), /MAPPING_REQUIRED_FIELD_MISSING/);
  const envelope = { version: 1, connectorId: 'connector-1', companyId: 'company-1', mappingVersion: 1, requestId: 'request-1', dryRun: false };
  const fileRecord = { version: 1, type: 'lead_file', sourceSystem: 'fixture', sourceTable: 'attachments', externalId: 'file-1', fingerprint: 'a'.repeat(64), payload: { leadExternalId: 'lead-1', objectPath: 'files/file-1', fileName: 'plan.pdf', mimeType: 'application/pdf', sizeBytes: 10, sha256: 'b'.repeat(64) } };
  assert.equal(validateIngestEnvelope({ ...envelope, records: [fileRecord] }).records.length, 1);
  assert.throws(() => validateIngestEnvelope({ ...envelope, records: [{ ...fileRecord, payload: { ...fileRecord.payload, secret: 'not-allowed' } }] }), /unknown field/);
});

test('BYODB employee and project mappings retain operational fields and references', () => {
  const columns = ['id', 'name', 'email', 'specialization', 'capacity', 'title', 'lead_id'];
  const schema = validateSourceSchema({ tables: [{ schema: 'public', name: 'records', columns: columns.map(name => ({ name, dataType: 'text', nullable: false })) }] });
  const base = { version: 1, mappingVersion: 1, sourceSystem: 'customer-db', schema: 'public', table: 'records', externalIdColumn: 'id' };
  const rule = (name: string, targetField = name) => ({ sourceColumn: name, targetField, conversion: { kind: 'text' } });
  const employeeFields = [rule('name'), rule('email'), rule('specialization'), rule('capacity')];
  assert.equal(validateConnectorMapping({ ...base, entityType: 'employee_directory', fields: employeeFields }, schema).fields.length, 4);
  assert.throws(() => validateConnectorMapping({ ...base, entityType: 'employee_directory', fields: [rule('name')] }, schema), /MAPPING_REQUIRED_FIELD_MISSING/);
  const projectFields = [rule('title'), rule('lead_id', 'leadExternalId')];
  assert.equal(validateConnectorMapping({ ...base, entityType: 'project', fields: projectFields }, schema).fields.length, 2);
  assert.throws(() => validateConnectorMapping({ ...base, entityType: 'project', fields: [rule('lead_id', 'leadExternalId')] }, schema), /MAPPING_REQUIRED_FIELD_MISSING/);
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

test('synthetic connector completes enrollment, signed heartbeat, and tenant-bound mapped ingest', async () => {
  const companyId = '8123e456-e89b-42d3-a456-426614174000';
  const connectorId = '9123e456-e89b-42d3-a456-426614174000';
  const enrollmentCode = 'synthetic-enrollment-code-2026';
  const secret = Buffer.alloc(32, 23).toString('base64url');
  const expectedFingerprint = createHash('sha256').update(Buffer.from(secret, 'base64url')).digest('hex');
  const state = { enrollmentConsumed: false, heartbeat: null as unknown, records: new Map<string, { companyId: string; payload: unknown }>(), nonces: new Set<string>() };
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> }> = [];
  const service = {
    rpc: async (name: string, args: Record<string, unknown>) => {
      rpcCalls.push({ name, args });
      if (name === 'app_register_connector') {
        if (state.enrollmentConsumed || args.p_enrollment_code !== enrollmentCode || args.p_secret_fingerprint !== `\\x${expectedFingerprint}`) return { data: null, error: { code: 'REJECTED' } };
        state.enrollmentConsumed = true;
        return { data: { connector_id: connectorId, company_id: companyId }, error: null };
      }
      if (name === 'app_connector_heartbeat') {
        assert.equal(args.p_connector_id, connectorId);
        state.heartbeat = { status: args.p_status, schema: args.p_source_schema };
        return { data: null, error: null };
      }
      if (name === 'app_ingest_connector_batch') {
        assert.equal(args.p_connector_id, connectorId);
        const input = args.p_records as Array<{ externalId: string; payload: unknown }>;
        for (const record of input) state.records.set(record.externalId, { companyId, payload: record.payload });
        return { data: { version: 1, requestId: args.p_request_id, accepted: true, results: input.map(record => ({ externalId: record.externalId, type: 'company', status: 'created' })) }, error: null };
      }
      throw new Error(`unexpected RPC: ${name}`);
    },
  } as never;
  let storedIdentity: StoredConnectorIdentity | null = null;
  const options: ConnectorApiOptions = {
    baseUrl: 'https://api.example.test',
    identity: { algorithm: 'HMAC-SHA256' as const, secret },
    fetcher: async (input: string | URL | Request, init?: RequestInit) => {
      const url = new URL(input instanceof Request ? input.url : input.toString());
      const rawBody = String(init?.body ?? '');
      const body = JSON.parse(rawBody) as Record<string, unknown>;
      const json = (value: unknown, status = 200) => new Response(JSON.stringify(value), { status, headers: { 'content-type': 'application/json' } });
      if (url.pathname === '/api/connector/register') {
        try {
          const result = await registerConnector(service, body);
          storedIdentity = { connectorId, companyId, secret, revoked: false, scopes: ['heartbeat', 'ingest'] };
          return json(result);
        } catch { return json({ code: 'CONNECTOR_REGISTRATION_REJECTED' }, 401); }
      }
      const headers = Object.fromEntries(new Headers(init?.headers).entries());
      const requiredScope = url.pathname.endsWith('/heartbeat') ? 'heartbeat' : 'ingest';
      let identity;
      try {
        identity = await authenticateConnectorRequest({
          method: String(init?.method ?? 'POST'), pathname: url.pathname, headers, rawBody, body,
          requiredScope, identity: storedIdentity,
          reserveNonce: async (_connectorId, requestId) => { if (state.nonces.has(requestId)) return false; state.nonces.add(requestId); return true; },
        });
      } catch { return json({ code: 'CONNECTOR_SIGNATURE_INVALID' }, 401); }
      if (requiredScope === 'heartbeat') return json(await recordConnectorHeartbeat(service, identity, body));
      return json(await ingestConnectorBatch(service, identity, body));
    },
    sleep: async () => undefined,
  };
  const api = new ConnectorApi(options);
  const registered = await api.enroll(enrollmentCode);
  options.connectorId = registered.connectorId;
  const sourceSchema = { tables: [{ schema: 'public', name: 'companies', columns: [
    { name: 'id', dataType: 'uuid', nullable: false, primaryKey: true, generated: false, hasDefault: false },
    { name: 'firma_nazev', dataType: 'text', nullable: false },
  ] }] };
  assert.deepEqual(registered, { connectorId, companyId });
  assert.deepEqual(await api.heartbeat({ status: 'mapping_required', version: '1.0.0', sourceSchema }), { accepted: true });
  const ack = await api.ingest({
    version: 1, connectorId, companyId, mappingVersion: 1, requestId: 'synthetic-ingest-1', dryRun: false,
    records: [{ version: 1, type: 'company', sourceSystem: 'fixture', sourceTable: 'companies', externalId: 'company-row-1', fingerprint: 'a'.repeat(64), payload: { name: 'Syntetická firma' } }],
  });
  assert.equal(ack.accepted, true);
  assert.equal(state.heartbeat && (state.heartbeat as { status: string }).status, 'mapping_required');
  assert.deepEqual(state.records.get('company-row-1'), { companyId, payload: { name: 'Syntetická firma' } });
  assert.deepEqual(rpcCalls.map(call => call.name), ['app_register_connector', 'app_connector_heartbeat', 'app_ingest_connector_batch']);
  assert.equal(state.enrollmentConsumed, true);
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

test('BYODB owner can queue mapped operational employees and projects but employees cannot', () => {
  const base = { version: 1, idempotencyKey: 'b6b2a8fc-2f0b-45df-9aa9-1578f58c86f0', mappingVersion: 4, action: 'create', externalId: 'stable-1', expectedSourceVersion: null };
  const mappingBase = { version: 1 as const, mappingVersion: 4, sourceSystem: 'fixture', schema: 'public', table: 'records', externalIdColumn: 'id' };
  const employeeMapping = { ...mappingBase, entityType: 'employee_directory' as const, fields: [
    { sourceColumn: 'name', targetField: 'name', conversion: { kind: 'text' as const } },
    { sourceColumn: 'email', targetField: 'email', conversion: { kind: 'email' as const } },
  ] };
  const employeeCreate = { ...base, entityType: 'employee_directory', payload: { name: 'Worker', email: 'worker@example.test' } };
  assert.equal(validateByodbOperationCreate(employeeCreate, 'owner', employeeMapping).entityType, 'employee_directory');
  assert.throws(() => validateByodbOperationCreate(employeeCreate, 'employee', employeeMapping), /OPERATION_ROLE_DENIED/);
  assert.throws(() => validateByodbOperationCreate({ ...employeeCreate, payload: { name: 'Worker' } }, 'owner', employeeMapping), /OPERATION_REQUIRED_FIELD_MISSING/);

  const projectMapping = { ...mappingBase, entityType: 'project' as const, fields: [
    { sourceColumn: 'title', targetField: 'title', conversion: { kind: 'text' as const } },
    { sourceColumn: 'lead_id', targetField: 'leadExternalId', conversion: { kind: 'text' as const } },
  ] };
  const projectCreate = { ...base, entityType: 'project', payload: { title: 'Roof', leadExternalId: 'lead-1' } };
  assert.equal(validateByodbOperationCreate(projectCreate, 'owner', projectMapping).entityType, 'project');
  assert.throws(() => validateByodbOperationCreate(projectCreate, 'employee', projectMapping), /OPERATION_ROLE_DENIED/);
  assert.throws(() => validateByodbOperationCreate({ ...projectCreate, payload: { leadExternalId: 'lead-1' } }, 'owner', projectMapping), /OPERATION_REQUIRED_FIELD_MISSING/);
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
    mappingDefinition: { version: 1, mappingVersion: 4, entityType: 'lead', sourceSystem: 'fixture', schema: 'public', table: 'leads', externalIdColumn: 'id', fields: [{ sourceColumn: 'status', targetField: 'status', conversion: { kind: 'text' } }] },
  };
  const sourceSchema = validateSourceSchema({ tables: [{ schema: 'public', name: 'leads', columns: [
    { name: 'id', dataType: 'text', nullable: false }, { name: 'status', dataType: 'text', nullable: false },
  ] }] });
  assert.deepEqual(validateByodbPollBatch([operation], sourceSchema), [operation]);
  assert.throws(() => validateByodbPollBatch([{ ...operation, connectionString: 'secret' }], sourceSchema), /OPERATION_RESPONSE_INVALID/);
  assert.throws(() => validateByodbPollBatch([{ ...operation, mappingDefinition: { ...operation.mappingDefinition, table: 'other' } }], sourceSchema), /OPERATION_RESPONSE_INVALID/);
  assert.throws(() => validateByodbPollBatch([{ ...operation, mappingDefinition: { ...operation.mappingDefinition, mappingVersion: 3 } }], sourceSchema), /OPERATION_RESPONSE_INVALID/);
  assert.throws(() => validateByodbPollBatch([{ ...operation, payload: { password: 'secret' } }], sourceSchema), /OPERATION_RESPONSE_INVALID/);
  assert.throws(() => validateByodbPollBatch([{ ...operation, actorEmail: 'not-an-email' }], sourceSchema), /OPERATION_RESPONSE_INVALID/);
  assert.throws(() => validateByodbPollBatch(Array.from({ length: 51 }, () => operation), sourceSchema), /OPERATION_RESPONSE_INVALID/);
});

test('BYODB operation requests keep tenant IDs on owner actions and derive connector scope for poll and ack', () => {
  const companyId = '8123e456-e89b-42d3-a456-426614174000';
  const connectorId = '9123e456-e89b-42d3-a456-426614174000';
  assert.deepEqual(validateByodbOperationRequest({ action: 'create', companyId, connectorId, operation: {} }), { action: 'create', companyId, connectorId, operation: {} });
  assert.deepEqual(validateByodbOperationRequest({ action: 'list', companyId, limit: 20 }), { action: 'list', companyId, limit: 20 });
  assert.deepEqual(validateByodbOperationRequest({ action: 'poll', limit: 10 }), { action: 'poll', limit: 10 });
  assert.deepEqual(validateByodbOperationRequest({ action: 'records', companyId, entityType: 'company' }), { action: 'records', companyId, entityType: 'company' });
  for (const entityType of ['employee_directory', 'project', 'lead_note', 'lead_file']) {
    assert.deepEqual(validateByodbOperationRequest({ action: 'records', companyId, entityType }), { action: 'records', companyId, entityType });
  }
  assert.deepEqual(validateByodbOperationRequest({ action: 'set_mode', companyId, connectorId, mode: 'byodb', driver: 'postgres', writeEnabled: false }), { action: 'set_mode', companyId, connectorId, mode: 'byodb', driver: 'postgres', writeEnabled: false });
  assert.throws(() => validateByodbOperationRequest({ action: 'poll', companyId, limit: 10 }), /OPERATION_REQUEST_INVALID/);
  assert.throws(() => validateByodbOperationRequest({ action: 'create', companyId, connectorId, userId: 'spoofed', operation: {} }), /OPERATION_REQUEST_INVALID/);
});

test('BYODB operational projections accept bounded canonical fields and reject unexpected source data', () => {
  const row = { externalId: 'row-1', fingerprint: 'a'.repeat(64), payload: { name: 'Worker', email: 'worker@example.test' } };
  assert.deepEqual(projectionRecords([row], 'employee_directory'), [row]);
  assert.deepEqual(projectionRecords([{ ...row, payload: { title: 'Roof', leadExternalId: 'lead-1' } }], 'project').length, 1);
  assert.deepEqual(projectionRecords([{ ...row, payload: { leadExternalId: 'lead-1', body: 'Note' } }], 'lead_note').length, 1);
  assert.deepEqual(projectionRecords([{ ...row, payload: { leadExternalId: 'lead-1', fileName: 'plan.pdf', sizeBytes: 2 } }], 'lead_file').length, 1);
  assert.throws(() => projectionRecords([{ ...row, payload: { ...row.payload, sourcePassword: 'secret' } }], 'employee_directory'), /BYODB_RECORDS_INVALID/);
  assert.throws(() => projectionRecords([{ ...row, payload: { name: { nested: 'leak' } } }], 'employee_directory'), /BYODB_RECORDS_INVALID/);
});

test('BYODB context validates lead and company mappings independently', () => {
  const context = { mode: 'byodb', driver: 'postgres', connectorId: 'c89e7d49-38fd-4f2b-b5ec-19a31de19d26', mappingVersion: 3, mappedTargets: ['title', 'status'], companyMappingVersion: 4, companyMappedTargets: ['name', 'companyNumber'], writeEnabled: true, connectorStatus: 'success' };
  assert.deepEqual(contextResponse(context), context);
  assert.throws(() => contextResponse({ ...context, companyMappedTargets: ['role'] }), /DATABASE_MODE_INVALID/);
});

test('heartbeat metrics cannot carry arbitrary source values', () => {
  assert.deepEqual(validateRunMetrics({ completedAt: '2026-10-05T08:00:00Z', processed: 12, changed: 2, failed: 1 }), { completedAt: '2026-10-05T08:00:00.000Z', processed: 12, changed: 2, failed: 1 });
  assert.throws(() => validateRunMetrics({ completedAt: '2026-10-05T08:00:00Z', processed: 1, changed: 1, failed: 0, sampleRow: { name: 'customer' } }), /RUN_METRICS_INVALID/);
});
