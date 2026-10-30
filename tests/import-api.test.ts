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

test('import commit refuses a production Supabase target even when worker flag is enabled', async () => {
  const previousFlag = process.env.APP_IMPORT_WORKER_ENABLED;
  const previousUrl = process.env.SUPABASE_URL;
  try {
    process.env.APP_IMPORT_WORKER_ENABLED = 'true';
    process.env.SUPABASE_URL = 'https://oncmtmrhmjlerbwkrecv.supabase.co';
    const response = responseProbe();
    await importHandler({ method: 'POST', body: {
      mode: 'commit', companyId: 'company-a', fileName: 'leads.csv', csv: 'id\nA-1',
    } }, response);
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.code, 'IMPORT_WORKER_DISABLED');
  } finally {
    if (previousFlag === undefined) delete process.env.APP_IMPORT_WORKER_ENABLED;
    else process.env.APP_IMPORT_WORKER_ENABLED = previousFlag;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
  }
});

test('import commit reaches input validation for the approved staging target', async () => {
  const previousFlag = process.env.APP_IMPORT_WORKER_ENABLED;
  const previousUrl = process.env.SUPABASE_URL;
  try {
    process.env.APP_IMPORT_WORKER_ENABLED = 'true';
    process.env.SUPABASE_URL = 'https://xwzweltjvreqhjpbjrxa.supabase.co';
    const response = responseProbe();
    await importHandler({ method: 'POST', body: {
      mode: 'commit', companyId: 'company-a', fileName: 'leads.csv', csv: 'id\nA-1',
    } }, response);
    assert.equal(response.statusCode, 400);
    assert.match(response.body.error, /přihlášený účet/);
  } finally {
    if (previousFlag === undefined) delete process.env.APP_IMPORT_WORKER_ENABLED;
    else process.env.APP_IMPORT_WORKER_ENABLED = previousFlag;
    if (previousUrl === undefined) delete process.env.SUPABASE_URL;
    else process.env.SUPABASE_URL = previousUrl;
  }
});

test('dry run binds the reviewed field mapping into its fingerprint', async () => {
  const base = {
    mode: 'dry_run', companyId: 'company-a', fileName: 'leads.csv', csv: 'name\nAlena',
  };
  const customerResponse = responseProbe();
  const titleResponse = responseProbe();

  await importHandler({ method: 'POST', body: { ...base, mapping: { name: 'customerName' } } }, customerResponse);
  await importHandler({ method: 'POST', body: { ...base, mapping: { name: 'title' } } }, titleResponse);

  assert.equal(customerResponse.statusCode, 200);
  assert.equal(titleResponse.statusCode, 200);
  assert.notEqual(customerResponse.body.fingerprint, titleResponse.body.fingerprint);
});

test('dry run rejects mappings to missing CSV columns', async () => {
  const response = responseProbe();
  await importHandler({ method: 'POST', body: {
    mode: 'dry_run', companyId: 'company-a', fileName: 'leads.csv', csv: 'name\nAlena',
    mapping: { missing_column: 'customerName' },
  } }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(response.body.code, 'IMPORT_MAPPING_INVALID');
});
