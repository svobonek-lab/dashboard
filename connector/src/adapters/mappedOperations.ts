import { createHash } from 'node:crypto';

import { CANONICAL_PAYLOAD_FIELDS, type CanonicalRecordV1, type ConnectorMappingDefinitionV1, type JsonPrimitive } from '../../../shared/connectorProtocol.js';
import { compileMapping } from '../mapping/compileMapping.js';
import type { SourceDriver, SourceSchema } from './types.js';
import { findKnownTable, quoteMssqlIdentifier, quoteMysqlIdentifier, quotePostgresIdentifier } from './sqlSafety.js';

export interface MappedSourceOperation {
  operationId: string;
  idempotencyKey: string;
  mappingVersion: number;
  entityType: 'company' | 'lead';
  action: 'create' | 'update' | 'delete';
  externalId: string;
  expectedSourceVersion: string | null;
  payload: Record<string, JsonPrimitive>;
  actorRole: 'owner' | 'employee';
  actorEmail: string;
  mappingDefinition?: ConnectorMappingDefinitionV1;
}

export interface SqlStatement { sql: string; values: unknown[] }
export interface MappedOperationStatements {
  select: SqlStatement;
  insert?: SqlStatement;
  update(payload: Record<string, JsonPrimitive>): SqlStatement;
  delete: SqlStatement;
}
export interface MappedOperationTransaction {
  begin(): Promise<void>;
  savepoint(name: string): Promise<void>;
  query(statement: SqlStatement): Promise<Record<string, unknown>[]>;
  rollbackToSavepoint(name: string): Promise<void>;
  releaseSavepoint(name: string): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;
  isDuplicateKeyError(error: unknown): boolean;
}

function placeholder(driver: SourceDriver, index: number): string {
  return driver === 'postgres' ? `$${index}` : driver === 'mssql' ? `@p${index}` : '?';
}

function quote(driver: SourceDriver, identifier: string, known: Set<string>): string {
  return driver === 'postgres' ? quotePostgresIdentifier(identifier, known)
    : driver === 'mssql' ? quoteMssqlIdentifier(identifier, known) : quoteMysqlIdentifier(identifier, known);
}

function sourceValue(value: JsonPrimitive, conversion: ConnectorMappingDefinitionV1['fields'][number]['conversion']): unknown {
  if (value === null) return null;
  switch (conversion.kind) {
    case 'text': case 'email': case 'phone': case 'datetime': return String(value);
    case 'number': case 'currency': {
      const number = typeof value === 'number' ? value : Number(value);
      if (!Number.isFinite(number)) throw new Error('OPERATION_MAPPING_INVALID');
      return number;
    }
    case 'boolean': {
      if (typeof value !== 'boolean') throw new Error('OPERATION_MAPPING_INVALID');
      return conversion.invert ? !value : value;
    }
    case 'enum': {
      if (typeof value !== 'string') throw new Error('OPERATION_MAPPING_INVALID');
      const entry = Object.entries(conversion.values).find(([, target]) => target === value);
      if (!entry) throw new Error('OPERATION_MAPPING_INVALID');
      return entry[0];
    }
  }
}

export function buildMappedOperationStatements(
  driver: SourceDriver,
  operation: MappedSourceOperation,
  mapping: ConnectorMappingDefinitionV1,
  schema: SourceSchema,
): MappedOperationStatements {
  if (!['company', 'lead'].includes(operation.entityType) || operation.entityType !== mapping.entityType
    || operation.mappingVersion !== mapping.mappingVersion || !operation.externalId || operation.externalId.length > 512
    || operation.expectedSourceVersion !== null && !/^[a-f0-9]{64}$/.test(operation.expectedSourceVersion)) throw new Error('OPERATION_INVALID');
  const targets = new Set(CANONICAL_PAYLOAD_FIELDS[operation.entityType]);
  const mappingTargets = new Set(mapping.fields.map(field => field.targetField));
  const payloadKeys = Object.keys(operation.payload);
  if (JSON.stringify(operation.payload).length > 8_192 || payloadKeys.some(key => !targets.has(key) || !mappingTargets.has(key))) throw new Error('OPERATION_MAPPING_INVALID');
  if (operation.action === 'create' ? operation.expectedSourceVersion !== null : !operation.expectedSourceVersion) throw new Error('OPERATION_VERSION_INVALID');
  if (operation.action === 'create' && !Object.hasOwn(operation.payload, operation.entityType === 'company' ? 'name' : 'title')) throw new Error('OPERATION_REQUIRED_FIELD_MISSING');
  if (operation.action === 'delete' && payloadKeys.length) throw new Error('OPERATION_MAPPING_INVALID');
  if (operation.action === 'update' && !payloadKeys.length) throw new Error('OPERATION_MAPPING_INVALID');

  const table = findKnownTable(schema, mapping.schema, mapping.table);
  const primaryKeys = table.columns.filter(column => column.primaryKey);
  if (primaryKeys.length !== 1 || primaryKeys[0]?.name !== mapping.externalIdColumn) throw new Error('OPERATION_STABLE_PRIMARY_KEY_REQUIRED');
  const keyColumn = table.columns.find(column => column.name === mapping.externalIdColumn)!;
  if (operation.action === 'create' && keyColumn.generated) throw new Error('OPERATION_STABLE_EXTERNAL_KEY_UNSUPPORTED');
  const selected = [...new Set([mapping.externalIdColumn, ...mapping.fields.map(field => field.sourceColumn), ...(mapping.updatedAtColumn ? [mapping.updatedAtColumn] : [])])];
  const known = new Set(table.columns.map(column => column.name));
  const q = (column: string) => quote(driver, column, known);
  const tableName = `${quote(driver, mapping.schema, new Set([mapping.schema]))}.${quote(driver, mapping.table, new Set([mapping.table]))}`;
  const selectLock = driver === 'mssql' ? ' WITH (UPDLOCK, ROWLOCK)' : '';
  const lockSuffix = driver === 'mssql' ? '' : ' FOR UPDATE';
  const keyParam = placeholder(driver, 1);
  const select: SqlStatement = {
    sql: `SELECT ${selected.map(q).join(', ')} FROM ${tableName}${selectLock} WHERE ${q(mapping.externalIdColumn)} = ${keyParam}${lockSuffix}`,
    values: [operation.externalId],
  };
  const fieldsFor = (payload: Record<string, JsonPrimitive>) => Object.entries(payload).map(([target, value]) => {
    const rule = mapping.fields.find(field => field.targetField === target);
    if (!rule) throw new Error('OPERATION_MAPPING_INVALID');
    return { column: rule.sourceColumn, value: sourceValue(value, rule.conversion) };
  });
  const insertFields = fieldsFor(operation.payload);
  const insertColumns = [mapping.externalIdColumn, ...insertFields.map(field => field.column)];
  const insert: SqlStatement | undefined = operation.action === 'create' ? (() => {
    for (const column of table.columns) {
      if (!column.nullable && !column.generated && !column.hasDefault && !insertColumns.includes(column.name)) throw new Error('OPERATION_CREATE_REQUIRED_COLUMN_MISSING');
    }
    const values = [operation.externalId, ...insertFields.map(field => field.value)];
    return { sql: `INSERT INTO ${tableName} (${insertColumns.map(q).join(', ')}) VALUES (${values.map((_, i) => placeholder(driver, i + 1)).join(', ')})`, values };
  })() : undefined;
  return {
    select,
    ...(insert ? { insert } : {}),
    update(payload) {
      if (operation.action !== 'update') throw new Error('OPERATION_ACTION_INVALID');
      const fields = fieldsFor(payload);
      const values = [...fields.map(field => field.value), operation.externalId];
      const assignments = fields.map((field, i) => `${q(field.column)} = ${placeholder(driver, i + 1)}`).join(', ');
      return { sql: `UPDATE ${tableName} SET ${assignments} WHERE ${q(mapping.externalIdColumn)} = ${placeholder(driver, values.length)}`, values };
    },
    delete: { sql: `DELETE FROM ${tableName} WHERE ${q(mapping.externalIdColumn)} = ${keyParam}`, values: [operation.externalId] },
  };
}

export function assertMappedOperationAuthorized(operation: MappedSourceOperation, mapping: ConnectorMappingDefinitionV1, sourcePayload: Record<string, unknown>): void {
  if (operation.actorRole !== 'employee') return;
  if (operation.entityType !== 'lead' || operation.action !== 'update' || Object.keys(operation.payload).length !== 1
    || typeof operation.payload.status !== 'string' || !mapping.fields.some(field => field.targetField === 'assignedToEmail')
    || typeof sourcePayload.assignedToEmail !== 'string'
    || sourcePayload.assignedToEmail.trim().toLowerCase() !== operation.actorEmail.trim().toLowerCase()) throw new Error('OPERATION_ROLE_DENIED');
}

export function fingerprintMappedSourceRow(row: Record<string, unknown>, mapping: ConnectorMappingDefinitionV1, schema: SourceSchema): string {
  const result = compileMapping(mapping, schema).mapRow(row);
  if (!result.record) throw new Error('SOURCE_ROW_INVALID');
  return result.record.fingerprint;
}
export async function applyMappedOperationWithTransaction(
  driver: SourceDriver,
  operation: MappedSourceOperation,
  mapping: ConnectorMappingDefinitionV1,
  schema: SourceSchema,
  transaction: MappedOperationTransaction,
): Promise<{ status: 'applied' | 'conflict'; sourceVersion?: string; record?: CanonicalRecordV1; replayed?: boolean }> {
  const statements = buildMappedOperationStatements(driver, operation, mapping, schema);
  try {
    await transaction.begin();
    let rows = await transaction.query(statements.select);
    if (operation.action === 'create') {
      if (rows.length) {
        const replayed = rows[0] && isCreateReplay(rows[0], operation, mapping, schema);
        await transaction.commit();
        return replayed ? { status: 'applied', sourceVersion: fingerprintMappedSourceRow(rows[0]!, mapping, schema), record: compileMapping(mapping, schema).mapRow(rows[0]!).record!, replayed: true } : { status: 'conflict' };
      }
      await transaction.savepoint('byodb_create');
      try {
        await transaction.query(statements.insert!);
        await transaction.releaseSavepoint('byodb_create');
      } catch (error) {
        if (!transaction.isDuplicateKeyError(error)) throw error;
        await transaction.rollbackToSavepoint('byodb_create');
        await transaction.releaseSavepoint('byodb_create');
        rows = await transaction.query(statements.select);
        if (!rows[0] || !isCreateReplay(rows[0], operation, mapping, schema)) {
          await transaction.commit();
          return { status: 'conflict' };
        }
        await transaction.commit();
        return { status: 'applied', sourceVersion: fingerprintMappedSourceRow(rows[0], mapping, schema), record: compileMapping(mapping, schema).mapRow(rows[0]).record!, replayed: true };
      }
      rows = await transaction.query(statements.select);
      if (!rows[0]) throw new Error('SOURCE_WRITE_REJECTED');
      const sourceVersion = fingerprintMappedSourceRow(rows[0], mapping, schema);
      await transaction.commit();
      return { status: 'applied', sourceVersion, record: compileMapping(mapping, schema).mapRow(rows[0]).record! };
    }

    const current = rows[0];
    if (!current && operation.action === 'delete') {
      const sourceVersion = createHash('sha256').update(`deleted:${operation.idempotencyKey}`).digest('hex');
      await transaction.commit();
      return { status: 'applied', sourceVersion, replayed: true };
    }
    if (!current) {
      await transaction.commit();
      return { status: 'conflict' };
    }
    const sourceRecord = compileMapping(mapping, schema).mapRow(current).record;
    if (!sourceRecord) throw new Error('SOURCE_ROW_INVALID');
    assertMappedOperationAuthorized(operation, mapping, sourceRecord.payload);
    const currentVersion = sourceRecord.fingerprint;
    if (currentVersion !== operation.expectedSourceVersion) {
      if (operation.action === 'update' && Object.entries(operation.payload).every(([key, value]) => sourceRecord.payload[key] === value)) {
        await transaction.commit();
        return { status: 'applied', sourceVersion: currentVersion, record: sourceRecord, replayed: true };
      }
      await transaction.commit();
      return { status: 'conflict' };
    }
    if (operation.action === 'delete') {
      await transaction.query(statements.delete);
      const sourceVersion = createHash('sha256').update(`deleted:${operation.idempotencyKey}`).digest('hex');
      await transaction.commit();
      return { status: 'applied', sourceVersion };
    }
    await transaction.query(statements.update(operation.payload));
    rows = await transaction.query(statements.select);
    if (!rows[0]) throw new Error('SOURCE_WRITE_REJECTED');
    const sourceVersion = fingerprintMappedSourceRow(rows[0], mapping, schema);
    await transaction.commit();
    return { status: 'applied', sourceVersion, record: compileMapping(mapping, schema).mapRow(rows[0]).record! };
  } catch (error) {
    await transaction.rollback().catch(() => undefined);
    throw error;
  }
}

function isCreateReplay(row: Record<string, unknown>, operation: MappedSourceOperation, mapping: ConnectorMappingDefinitionV1, schema: SourceSchema): boolean {
  const record = compileMapping(mapping, schema).mapRow(row).record;
  if (!record) return false;
  return Object.entries(operation.payload).every(([key, value]) => record.payload[key] === value);
}
