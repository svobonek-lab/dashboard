import assert from 'node:assert/strict';
import test from 'node:test';
import mysql from 'mysql2/promise';

import { createSourceAdapter } from '../../src/adapters/types.js';
import { quoteMysqlIdentifier } from '../../src/adapters/sqlSafety.js';
import { assertAdapterContract } from './contract.js';

test('MySQL identifiers are quoted only after metadata allowlisting', () => {
  assert.equal(quoteMysqlIdentifier('customers', new Set(['customers'])), '`customers`');
  assert.throws(() => quoteMysqlIdentifier('other', new Set(['customers'])), /not present in inspected schema/);
});

test('selects MariaDB and MySQL adapters without opening a connection', () => {
  assert.equal(createSourceAdapter({ driver: 'mysql', host: 'db.example.test', port: 3306, database: 'fixture', username: 'reader', password: 'secret' }).driver, 'mysql');
  assert.equal(createSourceAdapter({ driver: 'mariadb', host: 'db.example.test', port: 3306, database: 'fixture', username: 'reader', password: 'secret' }).driver, 'mariadb');
});

test('MariaDB read-only proof fails closed when no readable table exists', async () => {
  const adapter = createSourceAdapter({ driver: 'mariadb', host: 'db.example.test', port: 3306, database: 'fixture', username: 'reader', password: 'secret' });
  adapter.inspectSchema = async () => ({ inspectedAt: new Date(0).toISOString(), tables: [] });
  assert.deepEqual(await adapter.verifyReadOnly(), { selectAllowed: false, writesDenied: false });
  await adapter.close();
});

test('MariaDB adapter contract', { skip: process.env.RUN_DB_INTEGRATION !== '1' }, async () => {
  await assertAdapterContract({
    create: createSourceAdapter,
    config: { driver: 'mariadb', host: '127.0.0.1', port: 53306, database: 'fixture', username: 'fixture_reader', password: 'fixture_reader_password' },
  });
});

test('MariaDB fixture account denies direct writes', { skip: process.env.RUN_DB_INTEGRATION !== '1' }, async () => {
  const connection = await mysql.createConnection({ host: '127.0.0.1', port: 53306, database: 'fixture', user: 'fixture_reader', password: 'fixture_reader_password' });
  try {
    await assert.rejects(connection.query("INSERT INTO leads (id, title, updated_at) VALUES (99, 'denied', NOW())"), /denied|command denied/i);
    await assert.rejects(connection.query("UPDATE customers SET name = 'denied' WHERE id = 1"), /denied|command denied/i);
    await assert.rejects(connection.query('DELETE FROM customers WHERE id = 1'), /denied|command denied/i);
  } finally { await connection.end(); }
});
