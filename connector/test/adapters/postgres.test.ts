import assert from 'node:assert/strict';
import test from 'node:test';
import pg from 'pg';

import { createSourceAdapter } from '../../src/adapters/types.js';
import { quotePostgresIdentifier, validatePageLimit } from '../../src/adapters/sqlSafety.js';
import { assertAdapterContract } from './contract.js';

test('PostgreSQL identifiers and page limits fail closed', () => {
  assert.equal(quotePostgresIdentifier('updated_at', new Set(['updated_at'])), '"updated_at"');
  assert.throws(() => quotePostgresIdentifier('updated_at; DELETE', new Set(['updated_at'])), /unsupported identifier/);
  assert.throws(() => validatePageLimit(1001), /between 1 and 1000/);
});

test('selects the PostgreSQL adapter without opening a connection', () => {
  const adapter = createSourceAdapter({ driver: 'postgres', host: 'db.example.test', port: 5432, database: 'fixture', username: 'reader', password: 'secret' });
  assert.equal(adapter.driver, 'postgres');
});

test('PostgreSQL read-only proof fails closed when no readable table exists', async () => {
  const adapter = createSourceAdapter({ driver: 'postgres', host: 'db.example.test', port: 5432, database: 'fixture', username: 'reader', password: 'secret' });
  adapter.inspectSchema = async () => ({ inspectedAt: new Date(0).toISOString(), tables: [] });
  assert.deepEqual(await adapter.verifyReadOnly(), { selectAllowed: false, writesDenied: false });
  await adapter.close();
});

test('PostgreSQL adapter contract', { skip: process.env.RUN_DB_INTEGRATION !== '1' }, async () => {
  await assertAdapterContract({
    create: createSourceAdapter,
    config: { driver: 'postgres', host: '127.0.0.1', port: 25432, database: 'fixture', username: 'fixture_reader', password: 'fixture_reader_password', schema: 'public' },
  });
});

test('PostgreSQL fixture account denies direct writes', { skip: process.env.RUN_DB_INTEGRATION !== '1' }, async () => {
  const pool = new pg.Pool({ host: '127.0.0.1', port: 25432, database: 'fixture', user: 'fixture_reader', password: 'fixture_reader_password' });
  try {
    await assert.rejects(pool.query("INSERT INTO leads (id, title, updated_at) VALUES (99, 'denied', now())"), /permission denied/i);
    await assert.rejects(pool.query("UPDATE customers SET name = 'denied' WHERE id = 1"), /permission denied/i);
    await assert.rejects(pool.query('DELETE FROM customers WHERE id = 1'), /permission denied/i);
  } finally { await pool.end(); }
});
