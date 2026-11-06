import assert from 'node:assert/strict';
import test from 'node:test';
import statusHandler from '../api/email-notification-status';
import outbox from '../api/outbox-scheduler';

test('provider status recognizes the existing Resend environment name', async () => {
  const names = ['EMAIL_PROVIDER_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM'];
  const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    delete process.env.EMAIL_PROVIDER_API_KEY;
    process.env.RESEND_API_KEY = 'synthetic-provider';
    process.env.EMAIL_FROM = 'StavbaFlow <sender@example.test>';
    const res = { code: 0, body: null as any, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; } };
    await statusHandler({ method: 'GET' }, res);
    assert.deepEqual(res.body, { providerConfigured: true, state: 'ready' });
    delete process.env.EMAIL_FROM;
    await statusHandler({ method: 'GET' }, res);
    assert.equal(res.body.providerConfigured, false);
  } finally {
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name];
    }
  }
});

test('outbox uses the existing Resend key but still requires durable run evidence before sending', async () => {
  const names = ['CRON_SECRET', 'EMAIL_PROVIDER_API_KEY', 'RESEND_API_KEY', 'EMAIL_FROM', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'];
  const saved = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  let databaseCalls = 0;
  try {
    process.env.CRON_SECRET = 'synthetic-cron';
    delete process.env.EMAIL_PROVIDER_API_KEY;
    process.env.RESEND_API_KEY = 'synthetic-provider';
    process.env.EMAIL_FROM = 'StavbaFlow <sender@example.test>';
    process.env.SUPABASE_URL = 'https://synthetic.supabase.test';
    process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-service';
    globalThis.fetch = async input => {
      const url = String(input instanceof Request ? input.url : input);
      assert.match(url, /\/rest\/v1\/app_email_outbox_runs/);
      databaseCalls++;
      return new Response('{"message":"missing relation"}', { status: 404 });
    };
    const res = { code: 0, body: null as any, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; } };
    await outbox({ method: 'POST', headers: { authorization: 'Bearer synthetic-cron' } }, res);
    assert.equal(res.body.code, 'OUTBOX_RUN_EVIDENCE_UNAVAILABLE');
    assert.equal(databaseCalls, 1);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of names) {
      if (saved[name] === undefined) delete process.env[name]; else process.env[name] = saved[name];
    }
  }
});
