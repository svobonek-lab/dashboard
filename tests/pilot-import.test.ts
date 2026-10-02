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

test('CSV parser preserves quoted multiline descriptions and every row', () => {
  const result = parseCsvDryRun('id;zakaznik_jmeno;popis\nA-1;Alena;"První řádek\ndruhý řádek"\nA-2;Boris;Jednoduchý');
  assert.equal(result.rows.length, 2);
  assert.equal(result.rows[0].popis, 'První řádek\ndruhý řádek');
  assert.equal(result.rows[1].zakaznik_jmeno, 'Boris');
});

test('CSV fingerprint includes field mapping so a remap is a distinct reviewed import', () => {
  const first = createImportFingerprint('company-a', 'leads.csv', 'name\nA', { name: 'customerName' });
  const remapped = createImportFingerprint('company-a', 'leads.csv', 'name\nA', { name: 'title' });
  assert.notEqual(first, remapped);
});

test('SQL connector reports unavailable instead of inventing a successful connection', () => {
  const result = unsupportedSqlConnection();

  assert.equal(result.success, false);
  assert.equal(result.connectedStatus, 'disconnected');
  assert.equal(result.availableTables.length, 0);
  assert.equal(result.sampleRows.length, 0);
  assert.match(result.message, /read-only|CSV|aktiv/i);
});
