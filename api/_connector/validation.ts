import { CANONICAL_ENTITY_TYPES, CANONICAL_PAYLOAD_FIELDS, type ConnectorDryRunSummaryV1, type ConnectorMappingDefinitionV1, type ConnectorSourceSchemaV1, type IngestEnvelopeV1 } from '../../shared/connectorProtocol.js';
import { validateCanonicalRecord } from '../../connector/src/protocol/canonical.js';
import { ConnectorHttpError } from './http.js';
import { z } from 'zod';

const ingestRecordSchema = z.strictObject({
  version: z.literal(1),
  type: z.enum(CANONICAL_ENTITY_TYPES),
  sourceSystem: z.string().min(1).max(160),
  sourceTable: z.string().min(1).max(256),
  externalId: z.string().min(1).max(512),
  sourceUpdatedAt: z.string().optional(),
  fingerprint: z.string().regex(/^[0-9a-fA-F]{64}$/),
  payload: z.record(z.string(), z.json()),
});

const ingestEnvelopeSchema = z.strictObject({
  version: z.literal(1),
  connectorId: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/),
  companyId: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/),
  mappingVersion: z.number().int().positive(),
  requestId: z.string().regex(/^[A-Za-z0-9_-]{1,160}$/),
  dryRun: z.boolean(),
  dryRunSummary: z.unknown().optional(),
  records: z.array(ingestRecordSchema).max(250),
});

const ENVELOPE_FIELDS = new Set(['version', 'connectorId', 'companyId', 'mappingVersion', 'requestId', 'dryRun', 'dryRunSummary', 'records']);
const SAFE_ID = /^[A-Za-z0-9_-]{1,160}$/;
const SAFE_SOURCE_IDENTIFIER = /^[\p{L}\p{N}_.$ -]{1,128}$/u;
const DRY_RUN_CODES = new Set(['EXTERNAL_ID_MISSING', 'REQUIRED_VALUE_MISSING', 'CONVERSION_INVALID', 'ENUM_VALUE_UNKNOWN']);
const SECRET_LIKE = /password|secret|token|private[_-]?key|api[_-]?key/i;

const connectorModeSchema = z.strictObject({
  version: z.literal(1),
  mode: z.enum(['managed_cloud', 'byodb']),
  driver: z.enum(['postgres', 'mysql', 'mariadb', 'mssql']).optional(),
}).refine(value => value.mode === 'byodb' ? value.driver !== undefined : value.driver === undefined);

export function validateConnectorDatabaseMode(value: unknown) {
  const parsed = connectorModeSchema.safeParse(value);
  if (!parsed.success) throw new ConnectorHttpError('DATABASE_MODE_INVALID', 400);
  return parsed.data;
}
function validateConversion(value: unknown): ConnectorMappingDefinitionV1['fields'][number]['conversion'] {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorHttpError('MAPPING_INVALID', 400);
  const conversion = value as Record<string, unknown>;
  const kind = String(conversion.kind ?? '');
  const allowed = kind === 'boolean' ? ['kind', 'invert'] : kind === 'currency' ? ['kind', 'decimalSeparator'] : kind === 'enum' ? ['kind', 'values'] : ['kind'];
  if (!['text', 'number', 'boolean', 'datetime', 'email', 'phone', 'currency', 'enum'].includes(kind)
    || Object.keys(conversion).some(key => !allowed.includes(key))) throw new ConnectorHttpError('MAPPING_INVALID', 400);
  if (kind === 'boolean' && conversion.invert !== undefined && typeof conversion.invert !== 'boolean') throw new ConnectorHttpError('MAPPING_INVALID', 400);
  if (kind === 'currency' && conversion.decimalSeparator !== undefined && !['.', ','].includes(String(conversion.decimalSeparator))) throw new ConnectorHttpError('MAPPING_INVALID', 400);
  if (kind === 'enum') {
    if (!conversion.values || typeof conversion.values !== 'object' || Array.isArray(conversion.values)) throw new ConnectorHttpError('MAPPING_INVALID', 400);
    const entries = Object.entries(conversion.values as Record<string, unknown>);
    if (entries.length < 1 || entries.length > 100 || entries.some(([key, item]) => !key || key.length > 160 || typeof item !== 'string' || item.length > 160 || SECRET_LIKE.test(key) || SECRET_LIKE.test(item))) throw new ConnectorHttpError('MAPPING_INVALID', 400);
  }
  return conversion as ConnectorMappingDefinitionV1['fields'][number]['conversion'];
}

function validateDryRunSummary(value: unknown, recordCount: number): ConnectorDryRunSummaryV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorHttpError('DRY_RUN_SUMMARY_INVALID', 400);
  const summary = value as Record<string, unknown>;
  for (const key of Object.keys(summary)) if (!['total', 'valid', 'failed', 'issues'].includes(key)) throw new ConnectorHttpError('DRY_RUN_SUMMARY_INVALID', 400);
  const total = Number(summary.total), valid = Number(summary.valid), failed = Number(summary.failed);
  if (![total, valid, failed].every(item => Number.isInteger(item) && item >= 0 && item <= 250) || total !== valid + failed || valid !== recordCount || !Array.isArray(summary.issues) || summary.issues.length > 100) {
    throw new ConnectorHttpError('DRY_RUN_SUMMARY_INVALID', 400);
  }
  const issues = summary.issues.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorHttpError('DRY_RUN_SUMMARY_INVALID', 400);
    const issue = value as Record<string, unknown>;
    for (const key of Object.keys(issue)) if (!['code', 'sourceColumn', 'targetField'].includes(key)) throw new ConnectorHttpError('DRY_RUN_SUMMARY_INVALID', 400);
    const code = String(issue.code ?? ''), sourceColumn = String(issue.sourceColumn ?? ''), targetField = issue.targetField === undefined ? undefined : String(issue.targetField);
    if (!DRY_RUN_CODES.has(code) || !SAFE_SOURCE_IDENTIFIER.test(sourceColumn) || (targetField !== undefined && !SAFE_SOURCE_IDENTIFIER.test(targetField))) throw new ConnectorHttpError('DRY_RUN_SUMMARY_INVALID', 400);
    return { code, sourceColumn, ...(targetField ? { targetField } : {}) } as ConnectorDryRunSummaryV1['issues'][number];
  });
  return { total, valid, failed, issues };
}

export function validateRunMetrics(value: unknown): { completedAt: string; processed: number; changed: number; failed: number } {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorHttpError('RUN_METRICS_INVALID', 400);
  const metrics = value as Record<string, unknown>;
  for (const key of Object.keys(metrics)) if (!['completedAt', 'processed', 'changed', 'failed'].includes(key)) throw new ConnectorHttpError('RUN_METRICS_INVALID', 400);
  const completedAt = String(metrics.completedAt ?? '');
  const completedDate = new Date(completedAt);
  const processed = Number(metrics.processed), changed = Number(metrics.changed), failed = Number(metrics.failed);
  if (Number.isNaN(completedDate.valueOf()) || ![processed, changed, failed].every(item => Number.isInteger(item) && item >= 0 && item <= 1_000_000) || changed + failed > processed) throw new ConnectorHttpError('RUN_METRICS_INVALID', 400);
  return { completedAt: completedDate.toISOString(), processed, changed, failed };
}

export function validateSourceSchema(value: unknown): ConnectorSourceSchemaV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value) || !Array.isArray((value as { tables?: unknown }).tables)) throw new ConnectorHttpError('SOURCE_SCHEMA_INVALID', 400);
  const tables = (value as { tables: unknown[] }).tables;
  if (tables.length > 100) throw new ConnectorHttpError('SOURCE_SCHEMA_INVALID', 400);
  return { tables: tables.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorHttpError('SOURCE_SCHEMA_INVALID', 400);
    const table = value as Record<string, unknown>;
    const schema = String(table.schema ?? ''), name = String(table.name ?? '');
    if (!SAFE_SOURCE_IDENTIFIER.test(schema) || !SAFE_SOURCE_IDENTIFIER.test(name) || !Array.isArray(table.columns) || table.columns.length > 200) throw new ConnectorHttpError('SOURCE_SCHEMA_INVALID', 400);
    const columns = table.columns.map(value => {
      if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorHttpError('SOURCE_SCHEMA_INVALID', 400);
      const column = value as Record<string, unknown>;
      const columnName = String(column.name ?? ''), dataType = String(column.dataType ?? '');
      if (!SAFE_SOURCE_IDENTIFIER.test(columnName) || !SAFE_SOURCE_IDENTIFIER.test(dataType) || typeof column.nullable !== 'boolean') throw new ConnectorHttpError('SOURCE_SCHEMA_INVALID', 400);
      return { name: columnName, dataType, nullable: column.nullable };
    });
    return { schema, name, columns };
  }) };
}

export function validateConnectorMapping(value: unknown, sourceSchema: ConnectorSourceSchemaV1): ConnectorMappingDefinitionV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorHttpError('MAPPING_INVALID', 400);
  const mapping = value as Record<string, unknown>;
  const allowedKeys = new Set(['version', 'mappingVersion', 'entityType', 'sourceSystem', 'schema', 'table', 'externalIdColumn', 'updatedAtColumn', 'deletedAtColumn', 'fields']);
  for (const key of Object.keys(mapping)) if (!allowedKeys.has(key)) throw new ConnectorHttpError('MAPPING_INVALID', 400);
  const entityType = String(mapping.entityType ?? '') as ConnectorMappingDefinitionV1['entityType'];
  const schema = String(mapping.schema ?? ''), table = String(mapping.table ?? ''), externalIdColumn = String(mapping.externalIdColumn ?? '');
  const sourceSystem = String(mapping.sourceSystem ?? '');
  if (mapping.version !== 1 || !Number.isInteger(mapping.mappingVersion) || Number(mapping.mappingVersion) < 1 || !CANONICAL_ENTITY_TYPES.includes(entityType)
    || !SAFE_SOURCE_IDENTIFIER.test(schema) || !SAFE_SOURCE_IDENTIFIER.test(table) || !SAFE_SOURCE_IDENTIFIER.test(externalIdColumn)
    || !SAFE_SOURCE_IDENTIFIER.test(sourceSystem) || !Array.isArray(mapping.fields) || mapping.fields.length < 1 || mapping.fields.length > 64) throw new ConnectorHttpError('MAPPING_INVALID', 400);
  const knownTable = sourceSchema.tables.find(item => item.schema === schema && item.name === table);
  if (!knownTable) throw new ConnectorHttpError('MAPPING_SOURCE_UNKNOWN', 400);
  const knownColumns = new Set(knownTable.columns.map(column => column.name));
  const optionalColumns = [mapping.updatedAtColumn, mapping.deletedAtColumn].filter((item): item is string => typeof item === 'string' && Boolean(item));
  const selectedColumns = [externalIdColumn, ...optionalColumns];
  if (!selectedColumns.every(column => knownColumns.has(column))) throw new ConnectorHttpError('MAPPING_SOURCE_UNKNOWN', 400);
  if (selectedColumns.some(column => SECRET_LIKE.test(column))) throw new ConnectorHttpError('MAPPING_INVALID', 400);
  const allowedTargets = new Set(CANONICAL_PAYLOAD_FIELDS[entityType]);
  const targets = new Set<string>();
  const fields = mapping.fields.map(value => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorHttpError('MAPPING_INVALID', 400);
    const field = value as Record<string, unknown>;
    if (Object.keys(field).some(key => !['sourceColumn', 'targetField', 'conversion', 'required'].includes(key))) throw new ConnectorHttpError('MAPPING_INVALID', 400);
    const sourceColumn = String(field.sourceColumn ?? ''), targetField = String(field.targetField ?? '');
    const conversion = validateConversion(field.conversion);
    if (!knownColumns.has(sourceColumn) || SECRET_LIKE.test(sourceColumn) || !allowedTargets.has(targetField) || targets.has(targetField)) throw new ConnectorHttpError('MAPPING_INVALID', 400);
    targets.add(targetField);
    return { sourceColumn, targetField, conversion, ...(field.required === true ? { required: true } : {}) };
  });
  return {
    version: 1,
    mappingVersion: Number(mapping.mappingVersion),
    entityType,
    sourceSystem,
    schema,
    table,
    externalIdColumn,
    ...(typeof mapping.updatedAtColumn === 'string' && mapping.updatedAtColumn ? { updatedAtColumn: mapping.updatedAtColumn } : {}),
    ...(typeof mapping.deletedAtColumn === 'string' && mapping.deletedAtColumn ? { deletedAtColumn: mapping.deletedAtColumn } : {}),
    fields,
  };
}

export function validateIngestEnvelope(value: unknown, identity?: { connectorId: string; companyId: string }): IngestEnvelopeV1 {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new ConnectorHttpError('ENVELOPE_INVALID', 400);
  const envelope = value as Record<string, unknown>;
  for (const key of Object.keys(envelope)) if (!ENVELOPE_FIELDS.has(key)) throw new ConnectorHttpError('ENVELOPE_INVALID', 400);
  if (Array.isArray(envelope.records) && envelope.records.length > 250) throw new ConnectorHttpError('BATCH_TOO_LARGE', 413);
  if (!ingestEnvelopeSchema.safeParse(value).success) throw new ConnectorHttpError('ENVELOPE_INVALID', 400);
  if (envelope.version !== 1 || !SAFE_ID.test(String(envelope.connectorId ?? '')) || !SAFE_ID.test(String(envelope.companyId ?? ''))
    || !SAFE_ID.test(String(envelope.requestId ?? '')) || !Number.isInteger(envelope.mappingVersion) || Number(envelope.mappingVersion) < 1
    || typeof envelope.dryRun !== 'boolean' || !Array.isArray(envelope.records)) throw new ConnectorHttpError('ENVELOPE_INVALID', 400);
  if (envelope.records.length > 250) throw new ConnectorHttpError('BATCH_TOO_LARGE', 413);
  if (identity && (envelope.connectorId !== identity.connectorId || envelope.companyId !== identity.companyId)) throw new ConnectorHttpError('TENANT_MISMATCH', 403);
  const records = envelope.records.map(record => validateCanonicalRecord(record));
  if (!envelope.dryRun && envelope.dryRunSummary !== undefined) throw new ConnectorHttpError('DRY_RUN_SUMMARY_INVALID', 400);
  const dryRunSummary = envelope.dryRun ? validateDryRunSummary(envelope.dryRunSummary, records.length) : undefined;
  return { ...envelope, records, ...(dryRunSummary ? { dryRunSummary } : {}) } as unknown as IngestEnvelopeV1;
}
