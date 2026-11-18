import assert from 'node:assert/strict';
import test from 'node:test';
import outbox from '../api/outbox-scheduler';

test('staging Gmail leaves unrelated pending mail untouched and quarantines a stale claim', async () => {
  const names = [
    'CRON_SECRET', 'EMAIL_FROM', 'SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY',
    'VERCEL_ENV', 'VERCEL_GIT_COMMIT_REF', 'STAGING_EMAIL_PROVIDER',
    'STAGING_GMAIL_USER', 'STAGING_GMAIL_APP_PASSWORD', 'STAGING_EMAIL_ALLOWED_RECIPIENTS',
  ] as const;
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  const originalFetch = globalThis.fetch;
  const patches: any[] = [];
  try {
    Object.assign(process.env, {
      CRON_SECRET: 'synthetic-cron', EMAIL_FROM: 'sender@example.test',
      SUPABASE_URL: 'https://synthetic.supabase.test', SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service',
      VERCEL_ENV: 'preview', VERCEL_GIT_COMMIT_REF: 'codex/staging-gmail-invitations',
      STAGING_EMAIL_PROVIDER: 'gmail_smtp', STAGING_GMAIL_USER: 'sender@example.test',
      STAGING_GMAIL_APP_PASSWORD: 'synthetic-password',
      STAGING_EMAIL_ALLOWED_RECIPIENTS: 'owner-a@example.test,owner-b@example.test,employee-a@example.test,employee-b@example.test',
    });
    globalThis.fetch = async (input, init) => {
      const url = String(input instanceof Request ? input.url : input);
      const method = init?.method || 'GET';
      const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
        status, headers: { 'content-type': 'application/json' },
      });
      if (url.includes('/rest/v1/app_email_outbox_runs')) {
        if (method === 'POST') return json({ id: 'run-1' }, 201);
        if (method === 'PATCH') return json({ id: 'run-1' });
      }
      if (url.includes('/rest/v1/app_email_outbox')) {
        if (method === 'GET') {
          const filter = new URL(url).searchParams.get('recipient') || '';
          assert.match(filter, /^in\.\(/);
          assert.match(filter, /owner-a@example\.test/);
          assert.match(filter, /employee-b@example\.test/);
          return json([{
          id: 'unrelated-1', recipient: 'customer@example.test', subject: 'Unrelated', body: 'Private',
          status: 'pending', attempts: 0, scheduled_for: new Date(Date.now() - 60_000).toISOString(),
          created_at: new Date(Date.now() - 30 * 60_000).toISOString(),
        }, {
          id: 'email-1', recipient: 'owner-a@example.test', subject: 'Synthetic', body: 'Invite',
          status: 'processing', attempts: 1,
          updated_at: new Date(Date.now() - 16 * 60_000).toISOString(),
          created_at: new Date(Date.now() - 20 * 60_000).toISOString(),
        }]);
        }
        if (method === 'PATCH') {
          const body = JSON.parse(String(init?.body || '{}'));
          patches.push(body);
          if (body.status !== 'failed') throw new Error('SMTP claim must not be retried');
          return json({ id: 'email-1' });
        }
      }
      throw new Error(`Unexpected fetch ${method} ${url}`);
    };
    const res = { code: 0, body: null as any, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; } };
    await outbox({ method: 'POST', headers: { authorization: 'Bearer synthetic-cron', 'x-stavbaflow-immediate': '1' } }, res);
    assert.equal(res.code, 200);
    assert.equal(res.body.run.failed_count, 1);
    assert.equal(res.body.run.skipped_count, 1);
    assert.equal(res.body.run.error_code, 'OUTBOX_DELIVERY_STATE_UNKNOWN');
    assert.deepEqual(patches.map(patch => patch.status), ['failed']);
  } finally {
    globalThis.fetch = originalFetch;
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});
