import test from 'node:test';
import assert from 'node:assert/strict';
import { testGoogleSheetsConnection, executeGoogleSheetsSync } from '../lib/integrations/sheetsConnector';
import outbox from '../api/outbox-scheduler';

test('unsupported Sheets never returns invented records or partial successful sync', async () => {
  const config = { spreadsheetUrlOrId: 'invalid-id', sheetName: 'Sheet1' } as any;
  const result = await testGoogleSheetsConnection(config);
  assert.equal(result.success, false);
  assert.deepEqual(result.previewRows, []);
  await assert.rejects(executeGoogleSheetsSync(config, {}, 'synthetic-company'));
});

test('outbox fails before database access when no mail provider is configured', async () => {
  const names = ['CRON_SECRET','RESEND_API_KEY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
  const saved = Object.fromEntries(names.map(name => [name,process.env[name]]));
  try {
    process.env.CRON_SECRET='synthetic-cron';
    delete process.env.RESEND_API_KEY;
    process.env.SUPABASE_URL='https://invalid.example';
    process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic';
    const res = { code:0, body:null as any, status(code:number){this.code=code;return this;},json(body:any){this.body=body;return this;} };
    await outbox({method:'POST',headers:{authorization:'Bearer synthetic-cron'}},res);
    assert.equal(res.code,503);
    assert.equal(res.body.code,'EMAIL_PROVIDER_NOT_CONFIGURED');
    assert.equal(res.body.success,false);
  } finally {
    for(const name of names) { if(saved[name] === undefined) delete process.env[name]; else process.env[name]=saved[name]; }
  }
});
