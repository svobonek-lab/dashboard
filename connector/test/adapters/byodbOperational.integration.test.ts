import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import test from 'node:test';

import { createSourceAdapter, type SourceAdapterConfig } from '../../src/adapters/types.js';
import type { MappedSourceOperation } from '../../src/adapters/mappedOperations.js';
import type { ConnectorMappingDefinitionV1 } from '../../../shared/connectorProtocol.js';

const fixtures: Array<{ name: string; schema: string; config: SourceAdapterConfig }> = [
  { name: 'PostgreSQL', schema: 'public', config: { driver: 'postgres', host: '127.0.0.1', port: 25432, database: 'fixture', username: 'fixture_reader', password: 'fixture_reader_password', writeUsername: 'fixture_writer', writePassword: 'fixture_writer_password' } },
  { name: 'MariaDB', schema: 'fixture', config: { driver: 'mariadb', host: '127.0.0.1', port: 23306, database: 'fixture', username: 'fixture_reader', password: 'fixture_reader_password', writeUsername: 'fixture_writer', writePassword: 'fixture_writer_password' } },
  { name: 'SQL Server', schema: 'dbo', config: { driver: 'mssql', host: '127.0.0.1', port: 21433, database: 'fixture', username: 'fixture_reader', password: 'Synthetic_ReadOnly_9!', writeUsername: 'fixture_writer', writePassword: 'Synthetic_Write_9!' } },
];

for (const fixture of fixtures) {
  test(`${fixture.name} operational employee and project source writes are idempotent and version checked`, { skip: process.env.RUN_DB_INTEGRATION !== '1' }, async () => {
    const adapter = createSourceAdapter(fixture.config);
    try {
      const source = await adapter.inspectSchema();
      for (const entity of [
        { type: 'employee_directory' as const, table: 'byodb_employees', payload: { name: 'Synthetic worker', email: 'worker@example.test' } },
        { type: 'project' as const, table: 'byodb_projects', payload: { title: 'Synthetic roof' } },
      ]) {
        const id = randomUUID();
        const fields = Object.keys(entity.payload).map(targetField => ({ sourceColumn: targetField, targetField, conversion: { kind: targetField === 'email' ? 'email' as const : 'text' as const } }));
        const mapping: ConnectorMappingDefinitionV1 = { version: 1, mappingVersion: 1, entityType: entity.type, sourceSystem: 'fixture', schema: fixture.schema, table: entity.table, externalIdColumn: 'id', fields };
        const create: MappedSourceOperation = { operationId: randomUUID(), idempotencyKey: randomUUID(), mappingVersion: 1, entityType: entity.type, action: 'create', externalId: id, expectedSourceVersion: null, payload: entity.payload, actorRole: 'owner', actorEmail: 'owner@example.test' };
        const first = await adapter.applyMappedOperation(create, mapping, source);
        assert.equal(first.status, 'applied');
        assert.equal(first.record?.externalId, id);
        const replay = await adapter.applyMappedOperation(create, mapping, source);
        assert.equal(replay.status, 'applied');
        assert.equal(replay.replayed, true);
        const field = entity.type === 'project' ? 'title' : 'name';
        const update: MappedSourceOperation = { ...create, operationId: randomUUID(), idempotencyKey: randomUUID(), action: 'update', expectedSourceVersion: first.sourceVersion!, payload: { [field]: 'Updated synthetic value' } };
        const changed = await adapter.applyMappedOperation(update, mapping, source);
        assert.equal(changed.status, 'applied');
        const stale = await adapter.applyMappedOperation({ ...update, operationId: randomUUID(), idempotencyKey: randomUUID(), payload: { [field]: 'Stale overwrite' } }, mapping, source);
        assert.equal(stale.status, 'conflict');
        const deleted = await adapter.applyMappedOperation({ ...update, operationId: randomUUID(), idempotencyKey: randomUUID(), action: 'delete', expectedSourceVersion: changed.sourceVersion!, payload: {} }, mapping, source);
        assert.equal(deleted.status, 'applied');
        const rows = await adapter.readPage({ schema: fixture.schema, table: entity.table, primaryKey: 'id', columns: ['id'], limit: 20 });
        assert.equal(rows.rows.some(row => String(row.id).toLowerCase() === id), false);
      }
    } finally { await adapter.close(); }
  });
}
