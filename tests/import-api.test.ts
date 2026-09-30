import test from 'node:test';
import assert from 'node:assert/strict';
import importHandler from '../api/import-leads';

function responseProbe() {
  return {
    statusCode: 0,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
  };
}

test('import endpoint exposes a tenant-scoped CSV dry run without writing', async () => {
  const response = responseProbe();
  await importHandler({ method: 'POST', body: {
    mode: 'dry_run', companyId: 'company-a', fileName: 'leads.csv',
    csv: 'id;zakaznik_jmeno\nA-1;Alena Nováková',
  } }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(response.body.imported, false);
  assert.equal(response.body.rows, 1);
  assert.match(response.body.fingerprint, /^csv_/);
});

test('import endpoint keeps commit mode disabled unless the deployment enables the worker', async () => {
  const response = responseProbe();
  await importHandler({ method: 'POST', body: {
    mode: 'commit', companyId: 'company-a', fileName: 'leads.csv', csv: 'id\nA-1',
  } }, response);

  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, 'IMPORT_WORKER_DISABLED');
});
