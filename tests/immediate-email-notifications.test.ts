import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { requestImmediateOutboxDispatch } from '../src/app/emailNotifications';
import emailNotificationStatusHandler from '../api/email-notification-status';

const sql = readFileSync(new URL('../supabase/staging/20261014_immediate_email_notifications_contract.sql', import.meta.url), 'utf8');
const verifySql = readFileSync(new URL('../supabase/tests/immediate_email_notifications_verify.sql', import.meta.url), 'utf8');
const settings = readFileSync(new URL('../src/pages/owner/Settings.tsx', import.meta.url), 'utf8');
const widget = readFileSync(new URL('../features/WidgetIframePage.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8');

test('lead notification contract queues only public/widget/AI and assignment events', () => {
  assert.match(sql, /new\.source\s*=\s*any\s*\(array\['widget',\s*'public_form',\s*'ai_inbox'\]\)/i);
  assert.match(sql, /new\.assigned_to\s+is\s+distinct\s+from\s+old\.assigned_to/i);
  assert.match(sql, /email_notifications/i);
  assert.match(sql, /on conflict \(company_id, event_key\) do nothing/i);
  assert.doesNotMatch(sql, /csv_import.*insert into public\.app_email_outbox/is);
});

test('SQL acceptance covers idempotency, disabled notifications and foreign-safe content', () => {
  assert.match(verifySql, /public form retry must queue one owner notification/i);
  assert.match(verifySql, /disabled company must not queue notifications/i);
  assert.match(verifySql, /AI inbox retry must queue one owner notification/i);
  assert.match(verifySql, /assignment retry must queue one employee notification/i);
  assert.match(verifySql, /email body leaked sensitive contact data/i);
});

test('owner settings expose the notification toggle and honest provider state', () => {
  assert.match(settings, /emailNotifications/i);
  assert.match(settings, /Posílat e-mailová upozornění/i);
  assert.match(settings, /neodeslané/i);
  assert.match(settings, /email-notification-status/i);
});

test('widget and assignment request an immediate outbox dispatch', () => {
  assert.match(widget, /requestImmediateOutboxDispatch/);
  assert.match(app, /requestImmediateOutboxDispatch/);
});

test('CI executes the disposable notification contract', () => {
  assert.match(workflow, /20261014_immediate_email_notifications_contract\.sql/);
  assert.match(workflow, /immediate_email_notifications_verify\.sql/);
});

test('client reports a missing provider as queued, never delivered', async () => {
  const state = await requestImmediateOutboxDispatch(async () => new Response(
    JSON.stringify({ success: false, code: 'EMAIL_PROVIDER_NOT_CONFIGURED', queued: true }),
    { status: 503, headers: { 'content-type': 'application/json' } },
  ));
  assert.equal(state, 'provider_not_configured');
});

test('provider status endpoint is honest when RESEND_API_KEY is missing', async () => {
  const savedKey = process.env.RESEND_API_KEY;
  const savedFrom = process.env.EMAIL_FROM;
  try {
    delete process.env.RESEND_API_KEY;
    delete process.env.EMAIL_FROM;
    const res = { code: 0, body: null as any, status(code: number) { this.code = code; return this; }, json(body: any) { this.body = body; return this; } };
    await emailNotificationStatusHandler({ method: 'GET' }, res);
    assert.equal(res.code, 200);
    assert.deepEqual(res.body, { providerConfigured: false, state: 'not_configured' });
  } finally {
    if (savedKey === undefined) delete process.env.RESEND_API_KEY; else process.env.RESEND_API_KEY = savedKey;
    if (savedFrom === undefined) delete process.env.EMAIL_FROM; else process.env.EMAIL_FROM = savedFrom;
  }
});
