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

test('outbox does not send an email when another worker already claimed it', async () => {
  const names = ['CRON_SECRET','RESEND_API_KEY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
  const saved = Object.fromEntries(names.map(name => [name,process.env[name]]));
  const originalFetch = globalThis.fetch;
  let providerCalls = 0;
  try {
    process.env.CRON_SECRET='synthetic-cron';
    process.env.RESEND_API_KEY='synthetic-resend';
    process.env.SUPABASE_URL='https://synthetic.supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-service-role';
    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url === 'https://api.resend.com/emails') {
        providerCalls++;
        return new Response(JSON.stringify({ id: 'provider-message-id' }), { status: 200, headers: { 'content-type': 'application/json' } });
      }
      if (url.includes('/rest/v1/app_email_outbox') && (init?.method || 'GET') === 'GET') {
        return new Response(JSON.stringify([{
          id:'email-1', recipient:'worker@example.invalid', subject:'Pilot', body_html:'<p>Pilot</p>',
          status:'pending', attempts:0, scheduled_for:'2026-01-01T00:00:00.000Z', created_at:'2026-01-01T00:00:00.000Z',
        }]), { status: 200, headers: { 'content-type':'application/json' } });
      }
      if (url.includes('/rest/v1/app_email_outbox') && init?.method === 'PATCH') {
        const body = JSON.parse(String(init.body || '{}'));
        if (body.status === 'processing') {
          return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type':'application/json' } });
        }
        return new Response(JSON.stringify([]), { status: 200, headers: { 'content-type':'application/json' } });
      }
      throw new Error(`Unexpected fetch: ${init?.method || 'GET'} ${url}`);
    };
    const res = { code:0, body:null as any, status(code:number){this.code=code;return this;},json(body:any){this.body=body;return this;} };
    await outbox({method:'POST',headers:{authorization:'Bearer synthetic-cron'}},res);
    assert.equal(res.code,200);
    assert.equal(providerCalls,0);
    assert.equal(res.body.results[0].status,'skipped');
  } finally {
    globalThis.fetch = originalFetch;
    for(const name of names) { if(saved[name] === undefined) delete process.env[name]; else process.env[name]=saved[name]; }
  }
});

test('outbox sends to the provider with a stable idempotency key', async () => {
  const names = ['CRON_SECRET','RESEND_API_KEY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
  const saved = Object.fromEntries(names.map(name => [name,process.env[name]]));
  const originalFetch = globalThis.fetch;
  let providerIdempotencyKey: string | null = null;
  try {
    process.env.CRON_SECRET='synthetic-cron';
    process.env.RESEND_API_KEY='synthetic-resend';
    process.env.SUPABASE_URL='https://synthetic.supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-service-role';
    globalThis.fetch = async (input: string | URL | Request, init?: RequestInit) => {
      const url = String(input instanceof Request ? input.url : input);
      if (url === 'https://api.resend.com/emails') {
        providerIdempotencyKey = new Headers(init?.headers).get('Idempotency-Key');
        return new Response(JSON.stringify({ id:'provider-message-id' }), { status:200, headers:{'content-type':'application/json'} });
      }
      if (url.includes('/rest/v1/app_email_outbox') && (init?.method || 'GET') === 'GET') {
        return new Response(JSON.stringify([{ id:'email-1',recipient:'worker@example.invalid',subject:'Pilot',body_html:'<p>Pilot</p>',status:'pending',attempts:0,scheduled_for:'2026-01-01T00:00:00.000Z',created_at:'2026-01-01T00:00:00.000Z' }]), {status:200,headers:{'content-type':'application/json'}});
      }
      if (url.includes('/rest/v1/app_email_outbox') && init?.method === 'PATCH') {
        const body=JSON.parse(String(init.body||'{}'));
        if(body.status==='processing') return new Response(JSON.stringify({id:'email-1'}),{status:200,headers:{'content-type':'application/json'}});
        if(body.status==='delivered') return new Response(JSON.stringify({id:'email-1'}),{status:200,headers:{'content-type':'application/json'}});
        return new Response(null,{status:204});
      }
      throw new Error(`Unexpected fetch: ${init?.method || 'GET'} ${url}`);
    };
    const res={code:0,body:null as any,status(code:number){this.code=code;return this;},json(body:any){this.body=body;return this;}};
    await outbox({method:'POST',headers:{authorization:'Bearer synthetic-cron'}},res);
    assert.equal(res.code,200);
    assert.equal(providerIdempotencyKey,'outbox/email-1');
    assert.equal(res.body.results[0].status,'delivered');
  } finally {
    globalThis.fetch=originalFetch;
    for(const name of names){if(saved[name]===undefined) delete process.env[name]; else process.env[name]=saved[name];}
  }
});

test('outbox does not report delivered when persisting provider acceptance fails', async () => {
  const names = ['CRON_SECRET','RESEND_API_KEY','SUPABASE_URL','SUPABASE_SERVICE_ROLE_KEY'];
  const saved = Object.fromEntries(names.map(name => [name,process.env[name]]));
  const originalFetch = globalThis.fetch;
  try {
    process.env.CRON_SECRET='synthetic-cron';
    process.env.RESEND_API_KEY='synthetic-resend';
    process.env.SUPABASE_URL='https://synthetic.supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic-service-role';
    globalThis.fetch=async(input:string|URL|Request,init?:RequestInit)=>{
      const url=String(input instanceof Request?input.url:input);
      if(url==='https://api.resend.com/emails') return new Response(JSON.stringify({id:'provider-message-id'}),{status:200,headers:{'content-type':'application/json'}});
      if(url.includes('/rest/v1/app_email_outbox')&&(init?.method||'GET')==='GET') return new Response(JSON.stringify([{id:'email-1',recipient:'worker@example.invalid',subject:'Pilot',body:'Pilot',status:'pending',attempts:0,scheduled_for:'2026-01-01T00:00:00.000Z',created_at:'2026-01-01T00:00:00.000Z'}]),{status:200,headers:{'content-type':'application/json'}});
      if(url.includes('/rest/v1/app_email_outbox')&&init?.method==='PATCH'){
        const body=JSON.parse(String(init.body||'{}'));
        if(body.status==='processing') return new Response(JSON.stringify({id:'email-1'}),{status:200,headers:{'content-type':'application/json'}});
        if(body.status==='delivered') return new Response(JSON.stringify({message:'write failed'}),{status:500,headers:{'content-type':'application/json'}});
        return new Response(null,{status:204});
      }
      throw new Error(`Unexpected fetch: ${init?.method||'GET'} ${url}`);
    };
    const res={code:0,body:null as any,status(code:number){this.code=code;return this;},json(body:any){this.body=body;return this;}};
    await outbox({method:'POST',headers:{authorization:'Bearer synthetic-cron'}},res);
    assert.equal(res.code,200);
    assert.equal(res.body.processedCount,0);
    assert.equal(res.body.results[0].status,'retry');
  }finally{
    globalThis.fetch=originalFetch;
    for(const name of names){if(saved[name]===undefined) delete process.env[name]; else process.env[name]=saved[name];}
  }
});
