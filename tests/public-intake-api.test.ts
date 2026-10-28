import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPublicIntakeHandler,
  hashClientIp,
  readTrustedClientIp,
} from '../api/public-intake';

function responseRecorder() {
  return {
    code: 0,
    headers: {} as Record<string, string>,
    body: null as any,
    setHeader(name: string, value: string) { this.headers[name] = value; },
    status(code: number) { this.code = code; return this; },
    json(body: unknown) { this.body = body; return this; },
    end() { return this; },
  };
}

const validBody = {
  public_key: 'firm-a', request_key: 'web_1793037644_a1b2c3', customer: 'Eva Malá',
  phone: '+420 777 123 456', email: 'eva@example.invalid', title: 'Rekonstrukce',
  description: 'Nová střecha', value: 100000,
};

test('rate-limit identity comes only from Vercel trusted client IP headers', () => {
  assert.equal(readTrustedClientIp({ 'x-forwarded-for': '203.0.113.8, 10.0.0.4' }), '203.0.113.8');
  assert.equal(readTrustedClientIp({ 'x-forwarded-for': 'not-an-ip' }), null);
  assert.equal(readTrustedClientIp({}), null);
  assert.equal(hashClientIp('203.0.113.8', 'secret-a'), hashClientIp('203.0.113.8', 'secret-a'));
  assert.notEqual(hashClientIp('203.0.113.8', 'secret-a'), hashClientIp('203.0.113.8', 'secret-b'));
  assert.match(hashClientIp('203.0.113.8', 'secret-a'), /^[a-f0-9]{64}$/);
});

test('public intake proxy defaults closed without a secret or trusted client IP', async () => {
  let writes = 0;
  const handler = createPublicIntakeHandler({ hashSecret: 'test-secret-012345678901234567890123456789', submit: async () => { writes += 1; return null; } });
  for (const headers of [{}, { 'x-forwarded-for': 'spoofed' }]) {
    const res = responseRecorder();
    await handler({ method: 'POST', headers, body: validBody }, res);
    assert.equal(res.code, 503);
  }
  const noSecret = createPublicIntakeHandler({ submit: async () => { writes += 1; return null; } });
  const res = responseRecorder();
  await noSecret({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.8' }, body: validBody }, res);
  assert.equal(res.code, 503);
  assert.equal(writes, 0);
});

test('public intake rejects fields above the documented limits before database writes', async () => {
  let writes = 0;
  const handler = createPublicIntakeHandler({ hashSecret: 'test-secret-012345678901234567890123456789', submit: async () => { writes += 1; return null; } });
  const longCases = [
    { customer: 'x'.repeat(121) }, { phone: 'x'.repeat(31) },
    { email: `${'x'.repeat(243)}@example.invalid` }, { title: 'x'.repeat(121) },
    { description: 'x'.repeat(4001) }, { value: 1_000_000_001 },
  ];
  for (const override of longCases) {
    const res = responseRecorder();
    await handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.8' }, body: { ...validBody, ...override } }, res);
    assert.equal(res.code, 400);
  }
  assert.equal(writes, 0);
});

test('honeypot is acknowledged without writing and OPTIONS supports cross-origin widgets', async () => {
  let writes = 0;
  const handler = createPublicIntakeHandler({ hashSecret: 'test-secret-012345678901234567890123456789', submit: async () => { writes += 1; return null; } });
  const trapped = responseRecorder();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.8' }, body: { ...validBody, website: 'spam' } }, trapped);
  assert.equal(trapped.code, 202);
  assert.equal(writes, 0);
  const options = responseRecorder();
  await handler({ method: 'OPTIONS', headers: {}, body: {} }, options);
  assert.equal(options.code, 204);
  assert.equal(options.headers['Access-Control-Allow-Origin'], '*');
});

test('valid requests preserve the stable request key and pass only the HMAC IP hash to persistence', async () => {
  let saved: any;
  const handler = createPublicIntakeHandler({ hashSecret: 'test-secret-012345678901234567890123456789', submit: async (input) => { saved = input; return 'lead-id'; } });
  const res = responseRecorder();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.8' }, body: validBody }, res);
  assert.equal(res.code, 200);
  assert.equal(saved.requestKey, 'web_1793037644_a1b2c3');
  assert.equal(saved.publicKey, 'firm-a');
  assert.match(saved.clientIpHash, /^[a-f0-9]{64}$/);
  assert.equal(JSON.stringify(saved).includes('203.0.113.8'), false);
  assert.deepEqual(res.body, { status: 'accepted' });
});

test('public intake response never exposes the created or another company lead', async () => {
  const foreignLeadId = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
  const handler = createPublicIntakeHandler({
    hashSecret: 'test-secret-012345678901234567890123456789',
    submit: async () => foreignLeadId,
  });
  const res = responseRecorder();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.8' }, body: validBody }, res);
  assert.equal(res.code, 200);
  assert.deepEqual(res.body, { status: 'accepted' });
  assert.equal(JSON.stringify(res.body).includes(foreignLeadId), false);
  assert.equal(JSON.stringify(res.body).includes('company'), false);
});

test('SQL rate-limit responses are returned as HTTP 429 without exposing database errors', async () => {
  const handler = createPublicIntakeHandler({
    hashSecret: 'test-secret-012345678901234567890123456789',
    submit: async () => { throw Object.assign(new Error('rate limited'), { statusCode: 429 }); },
  });
  const res = responseRecorder();
  await handler({ method: 'POST', headers: { 'x-forwarded-for': '203.0.113.8' }, body: validBody }, res);
  assert.equal(res.code, 429);
  assert.equal(res.headers['Retry-After'], '600');
  assert.deepEqual(res.body, { error: 'rate_limited' });
});

test('public widget submits through the server proxy and SQL limits unique requests to five per ten minutes', async () => {
  const { readFileSync } = await import('node:fs');
  const widget = readFileSync(new URL('../src/features/submit-inquiry/ui/WidgetIframePage.tsx', import.meta.url), 'utf8');
  const migration = readFileSync(new URL('../supabase/migrations/20261026000000_public_intake_rate_limit.sql', import.meta.url), 'utf8');
  assert.match(widget, /fetch\(['"]\/api\/public-intake/);
  assert.doesNotMatch(widget, /publicSupabase\.rpc\('app_submit_public_lead'/);
  assert.match(widget, /name="website"/);
  assert.match(migration, /interval '10 minutes'/i);
  assert.match(migration, /count\(\*\)[\s\S]*?>=\s*5/i);
  assert.match(migration, /revoke all on function %s from public, anon, authenticated/i);
  assert.match(migration, /p\.proname = 'app_submit_public_lead'/i);
  assert.match(migration, /to service_role/i);
});
