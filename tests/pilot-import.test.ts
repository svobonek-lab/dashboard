import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsvDryRun, createImportFingerprint, unsupportedSqlConnection } from '../lib/integrations/pilotImport';

test('CSV dry run parses headers and reports mapping candidates without writing data', () => {
  const result = parseCsvDryRun('id;zakaznik_jmeno;cena_smluvni\nA-1;Alena Nováková;125000');

  assert.deepEqual(result.headers, ['id', 'zakaznik_jmeno', 'cena_smluvni']);
  assert.equal(result.rows.length, 1);
  assert.equal(result.rows[0].zakaznik_jmeno, 'Alena Nováková');
  assert.equal(result.mapping.zakaznik_jmeno.targetField, 'customerName');
  assert.equal(result.mapping.cena_smluvni.targetField, 'price');
  assert.equal(result.imported, false);
});

test('CSV import fingerprint is stable for idempotent retries', () => {
  const first = createImportFingerprint('company-a', 'leads.csv', 'id;name\n1;A');
  const second = createImportFingerprint('company-a', 'leads.csv', 'id;name\n1;A');
  const otherCompany = createImportFingerprint('company-b', 'leads.csv', 'id;name\n1;A');

  assert.equal(first, second);
  assert.notEqual(first, otherCompany);
});

test('SQL connector reports unavailable instead of inventing a successful connection', () => {
  const result = unsupportedSqlConnection();

  assert.equal(result.success, false);
  assert.equal(result.connectedStatus, 'disconnected');
  assert.equal(result.availableTables.length, 0);
  assert.equal(result.sampleRows.length, 0);
  assert.match(result.message, /read-only|CSV|aktiv/i);
});
