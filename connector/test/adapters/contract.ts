import assert from 'node:assert/strict';

import type { SourceAdapter, SourceAdapterConfig } from '../../src/adapters/types.js';

export interface AdapterContractOptions {
  config: SourceAdapterConfig;
  create: (config: SourceAdapterConfig) => SourceAdapter;
}

export async function assertAdapterContract(options: AdapterContractOptions): Promise<void> {
  const adapter = options.create(options.config);
  try {
    const connection = await adapter.testConnection();
    assert.equal(connection.ok, true);
    const schema = await adapter.inspectSchema();
    const customers = schema.tables.find(table => table.name === 'customers');
    assert.ok(customers);
    assert.ok(customers.columns.some(column => column.name === 'updated_at'));

    const first = await adapter.readPage({
      schema: customers.schema,
      table: customers.name,
      primaryKey: 'id',
      updatedAtColumn: 'updated_at',
      columns: ['id', 'name', 'updated_at'],
      limit: 2,
    });
    const second = await adapter.readPage({
      schema: customers.schema,
      table: customers.name,
      primaryKey: 'id',
      updatedAtColumn: 'updated_at',
      columns: ['id', 'name', 'updated_at'],
      limit: 2,
      cursor: first.nextCursor ?? undefined,
    });
    assert.equal(first.rows.length, 2);
    assert.equal(new Set([...first.rows, ...second.rows].map(row => String(row.id))).size, first.rows.length + second.rows.length);
    assert.equal((await adapter.verifyReadOnly()).writesDenied, true);
    await assert.rejects(adapter.readPage({
      schema: customers.schema,
      table: 'customers; DROP TABLE customers',
      primaryKey: 'id',
      columns: ['id'],
      limit: 1,
    }), /not present in inspected schema|unsupported identifier/);
  } finally {
    await adapter.close();
  }
}
