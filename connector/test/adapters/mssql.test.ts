import assert from 'node:assert/strict';
import test from 'node:test';
import sql from 'mssql';

import { createSourceAdapter } from '../../src/adapters/types.js';
import { quoteMssqlIdentifier } from '../../src/adapters/sqlSafety.js';
import { assertAdapterContract } from './contract.js';

test('SQL Server identifiers reject bracket and statement injection', () => {
  assert.equal(quoteMssqlIdentifier('dbo', new Set(['dbo'])), '[dbo]');
  assert.throws(() => quoteMssqlIdentifier('dbo]; DELETE', new Set(['dbo'])), /unsupported identifier/);
});

test('selects the SQL Server adapter without opening a connection', () => {
  assert.equal(createSourceAdapter({ driver: 'mssql', host: 'db.example.test', port: 1433, database: 'fixture', username: 'reader', password: 'secret' }).driver, 'mssql');
});

test('SQL Server read-only proof fails closed when no readable table exists', async () => {
  const adapter = createSourceAdapter({ driver: 'mssql', host: 'db.example.test', port: 1433, database: 'fixture', username: 'reader', password: 'secret' });
  adapter.inspectSchema = async () => ({ inspectedAt: new Date(0).toISOString(), tables: [] });
  assert.deepEqual(await adapter.verifyReadOnly(), { selectAllowed: false, writesDenied: false });
  await adapter.close();
});

test('SQL Server adapter contract', { skip: process.env.RUN_DB_INTEGRATION !== '1' }, async () => {
  await assertAdapterContract({
    create: createSourceAdapter,
    config: { driver: 'mssql', host: '127.0.0.1', port: 21433, database: 'fixture', username: 'fixture_reader', password: 'Synthetic_ReadOnly_9!' },
  });
});

test('SQL Server fixture account denies direct writes', { skip: process.env.RUN_DB_INTEGRATION !== '1' }, async () => {
  const pool = await sql.connect({ server: '127.0.0.1', port: 21433, database: 'fixture', user: 'fixture_reader', password: 'Synthetic_ReadOnly_9!', options: { encrypt: false, trustServerCertificate: true } });
  try {
    await assert.rejects(pool.request().query("INSERT INTO dbo.leads (id, title, updated_at) VALUES (99, 'denied', SYSDATETIMEOFFSET())"), /permission|denied/i);
    await assert.rejects(pool.request().query("UPDATE dbo.customers SET name = 'denied' WHERE id = 1"), /permission|denied/i);
    await assert.rejects(pool.request().query('DELETE FROM dbo.customers WHERE id = 1'), /permission|denied/i);
  } finally { await pool.close(); }
});
