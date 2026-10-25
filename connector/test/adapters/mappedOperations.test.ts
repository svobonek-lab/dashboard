import assert from 'node:assert/strict';
import test from 'node:test';

import { applyMappedOperationWithTransaction, buildMappedOperationStatements, assertMappedOperationAuthorized, fingerprintMappedSourceRow, type MappedOperationTransaction, type SqlStatement } from '../../src/adapters/mappedOperations.js';
import type { ConnectorMappingDefinitionV1 } from '../../../shared/connectorProtocol.js';
import type { SourceSchema } from '../../src/adapters/types.js';

const schema: SourceSchema = { inspectedAt: new Date(0).toISOString(), tables: [{ schema: 'public', name: 'leads', columns: [
  { name: 'id', dataType: 'uuid', nullable: false, primaryKey: true, generated: false },
  { name: 'title', dataType: 'text', nullable: false, primaryKey: false, generated: false },
  { name: 'status', dataType: 'text', nullable: false, primaryKey: false, generated: false },
  { name: 'assigned_email', dataType: 'text', nullable: false, primaryKey: false, generated: false },
  { name: 'updated_at', dataType: 'timestamp', nullable: false, primaryKey: false, generated: false, hasDefault: true },
] }] };
const mapping: ConnectorMappingDefinitionV1 = {
  version: 1, mappingVersion: 2, entityType: 'lead', sourceSystem: 'fixture', schema: 'public', table: 'leads',
  externalIdColumn: 'id', updatedAtColumn: 'updated_at', fields: [
    { sourceColumn: 'title', targetField: 'title', conversion: { kind: 'text' }, required: true },
    { sourceColumn: 'status', targetField: 'status', conversion: { kind: 'text' } },
    { sourceColumn: 'assigned_email', targetField: 'assignedToEmail', conversion: { kind: 'email' } },
  ],
};
const operation = {
  operationId: 'b6b2a8fc-2f0b-45df-9aa9-1578f58c86f0', idempotencyKey: 'c7b2a8fc-2f0b-45df-9aa9-1578f58c86f0',
  mappingVersion: 2, entityType: 'lead' as const, action: 'update' as const, externalId: 'lead-1',
  expectedSourceVersion: 'a'.repeat(64), payload: { status: 'active' }, actorRole: 'owner' as const, actorEmail: 'owner@example.test',
};

test('builds mapped update/delete SQL using inspected identifiers and bound values for every driver', () => {
  for (const driver of ['postgres', 'mysql', 'mariadb', 'mssql'] as const) {
    const statements = buildMappedOperationStatements(driver, operation, mapping, schema);
    assert.match(statements.select.sql, /FOR UPDATE|UPDLOCK/);
    assert.ok(statements.select.values.includes('lead-1'));
    assert.match(statements.update({ status: 'active' }).sql, /UPDATE/);
    assert.deepEqual(statements.update({ status: 'active' }).values.slice(0, -1), ['active']);
    assert.match(statements.delete.sql, /DELETE FROM/);
  }
});

test('rejects unmapped fields, injected identifiers, and tables without one stable primary key', () => {
  assert.throws(() => buildMappedOperationStatements('postgres', { ...operation, payload: { password: 'leak' } }, mapping, schema), /OPERATION_MAPPING_INVALID/);
  assert.throws(() => buildMappedOperationStatements('postgres', operation, { ...mapping, table: 'leads; DROP TABLE users' }, schema), /not present|identifier/);
  assert.throws(() => buildMappedOperationStatements('postgres', operation, mapping, { ...schema, tables: [{ ...schema.tables[0]!, columns: schema.tables[0]!.columns.map(column => ({ ...column, primaryKey: false })) }] }), /STABLE_PRIMARY_KEY/);
});

test('create requires an explicit stable source key and rejects identity-only generated keys', () => {
  const create = { ...operation, action: 'create' as const, expectedSourceVersion: null, externalId: 'stable-key', payload: { title: 'New', status: 'new', assignedToEmail: 'worker@example.test' } };
  const statements = buildMappedOperationStatements('postgres', create, mapping, schema);
  assert.match(statements.insert!.sql, /INSERT INTO/);
  assert.ok(statements.insert!.values.includes('stable-key'));
  const generatedSchema = { ...schema, tables: [{ ...schema.tables[0]!, columns: schema.tables[0]!.columns.map(column => column.name === 'id' ? { ...column, generated: true } : column) }] };
  assert.throws(() => buildMappedOperationStatements('postgres', create, mapping, generatedSchema), /STABLE_EXTERNAL_KEY/);
});

test('employee status writes require the source row to remain assigned to that employee', () => {
  const employeeOperation = { ...operation, actorRole: 'employee' as const, actorEmail: 'worker@example.test' };
  assert.throws(() => assertMappedOperationAuthorized(employeeOperation, mapping, { assignedToEmail: 'other@example.test' }), /OPERATION_ROLE_DENIED/);
  assert.doesNotThrow(() => assertMappedOperationAuthorized(employeeOperation, mapping, { assignedToEmail: 'WORKER@example.test' }));
  assert.throws(() => assertMappedOperationAuthorized({ ...employeeOperation, payload: { status: 'active', title: 'changed' } }, mapping, { assignedToEmail: 'worker@example.test' }), /OPERATION_ROLE_DENIED/);
});

test('mapped operations commit only after version and assignment checks, and roll back failed writes', async () => {
  class FakeTransaction implements MappedOperationTransaction {
    row: Record<string, unknown> | null;
    committed = false;
    rolledBack = false;
    failMutation = false;
    constructor(row: Record<string, unknown> | null) { this.row = row; }
    async begin() {}
    async savepoint() {}
    async query(statement: SqlStatement) {
      if (/^SELECT/.test(statement.sql)) return this.row ? [{ ...this.row }] : [];
      if (this.failMutation) throw new Error('write failed');
      if (/^UPDATE/.test(statement.sql)) this.row = { ...this.row!, status: statement.values[0] };
      else if (/^DELETE/.test(statement.sql)) this.row = null;
      else if (/^INSERT/.test(statement.sql)) this.row = { id: statement.values[0], title: statement.values[1], status: statement.values[2], assigned_email: statement.values[3], updated_at: '2026-10-25T00:00:00.000Z' };
      return [];
    }
    async rollbackToSavepoint() {}
    async releaseSavepoint() {}
    async commit() { this.committed = true; }
    async rollback() { this.rolledBack = true; }
    isDuplicateKeyError() { return false; }
  }
  const row = { id: 'lead-1', title: 'Lead', status: 'new', assigned_email: 'worker@example.test', updated_at: '2026-10-25T00:00:00.000Z' };
  const version = fingerprintMappedSourceRow(row, mapping, schema);
  const tx = new FakeTransaction(row);
  const applied = await applyMappedOperationWithTransaction('postgres', { ...operation, expectedSourceVersion: version }, mapping, schema, tx);
  assert.equal(applied.status, 'applied');
  assert.equal(tx.committed, true);
  assert.equal(tx.row?.status, 'active');

  const stale = new FakeTransaction(row);
  const conflict = await applyMappedOperationWithTransaction('postgres', operation, mapping, schema, stale);
  assert.equal(conflict.status, 'conflict');
  assert.equal(stale.row?.status, 'new');
  assert.equal(stale.committed, true);

  const failed = new FakeTransaction(row);
  failed.failMutation = true;
  await assert.rejects(applyMappedOperationWithTransaction('postgres', { ...operation, expectedSourceVersion: version }, mapping, schema, failed), /write failed/);
  assert.equal(failed.rolledBack, true);
});

test('source-side assigned lead check and idempotent create replay protect retries', async () => {
  class FakeTransaction implements MappedOperationTransaction {
    committed = false;
    rolledBack = false;
    constructor(public row: Record<string, unknown> | null) {}
    async begin() {}
    async savepoint() {}
    async query(statement: SqlStatement) {
      if (/^SELECT/.test(statement.sql)) return this.row ? [{ ...this.row }] : [];
      if (/^INSERT/.test(statement.sql)) this.row = { id: statement.values[0], title: statement.values[1], status: statement.values[2], assigned_email: statement.values[3], updated_at: '2026-10-25T00:00:00.000Z' };
      return [];
    }
    async commit() { this.committed = true; }
    async rollbackToSavepoint() {}
    async releaseSavepoint() {}
    async rollback() { this.rolledBack = true; }
    isDuplicateKeyError() { return false; }
  }
  const create = { ...operation, action: 'create' as const, expectedSourceVersion: null, externalId: 'stable-key', payload: { title: 'New', status: 'new', assignedToEmail: 'worker@example.test' } };
  const tx = new FakeTransaction(null);
  const first = await applyMappedOperationWithTransaction('postgres', create, mapping, schema, tx);
  assert.equal(first.status, 'applied');
  const replay = await applyMappedOperationWithTransaction('postgres', create, mapping, schema, new FakeTransaction(tx.row));
  assert.equal(replay.replayed, true);

  const employee = { ...operation, actorRole: 'employee' as const, actorEmail: 'worker@example.test', expectedSourceVersion: fingerprintMappedSourceRow({ id: 'lead-1', title: 'Lead', status: 'new', assigned_email: 'other@example.test', updated_at: '2026-10-25T00:00:00.000Z' }, mapping, schema) };
  const wrongAssignee = new FakeTransaction({ id: 'lead-1', title: 'Lead', status: 'new', assigned_email: 'other@example.test', updated_at: '2026-10-25T00:00:00.000Z' });
  await assert.rejects(applyMappedOperationWithTransaction('postgres', employee, mapping, schema, wrongAssignee), /OPERATION_ROLE_DENIED/);
  assert.equal(wrongAssignee.rolledBack, true);
});
