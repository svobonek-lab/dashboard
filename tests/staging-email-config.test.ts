import assert from 'node:assert/strict';
import test from 'node:test';
import statusHandler from '../api/email-notification-status';

const names = [
  'VERCEL_ENV', 'VERCEL_GIT_COMMIT_REF', 'STAGING_EMAIL_PROVIDER',
  'STAGING_GMAIL_USER', 'STAGING_GMAIL_APP_PASSWORD',
  'STAGING_EMAIL_ALLOWED_RECIPIENTS', 'EMAIL_FROM',
  'EMAIL_PROVIDER_API_KEY', 'RESEND_API_KEY',
] as const;

async function statusWith(values: Record<string, string | undefined>) {
  const previous = Object.fromEntries(names.map(name => [name, process.env[name]]));
  try {
    for (const name of names) {
      const value = values[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
    const res = { body: null as any, status(_code: number) { return this; }, json(body: any) { this.body = body; } };
    await statusHandler({ method: 'GET' }, res);
    return res.body;
  } finally {
    for (const name of names) {
      const value = previous[name];
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  }
}

const gmail = {
  VERCEL_ENV: 'preview',
  VERCEL_GIT_COMMIT_REF: 'codex/managed-cloud-onboarding',
  STAGING_EMAIL_PROVIDER: 'gmail_smtp',
  STAGING_GMAIL_USER: 'sender@example.test',
  STAGING_GMAIL_APP_PASSWORD: 'synthetic-password',
  STAGING_EMAIL_ALLOWED_RECIPIENTS: 'owner-a@example.test,owner-b@example.test,employee-a@example.test,employee-b@example.test',
  EMAIL_FROM: 'sender@example.test',
};

test('complete Gmail SMTP config is ready on the exact staging Preview branch', async () => {
  assert.deepEqual(await statusWith(gmail), { providerConfigured: true, state: 'ready' });
});

test('Gmail SMTP config fails closed outside the exact Preview branch even with an inherited Resend key', async () => {
  for (const override of [
    { VERCEL_ENV: 'production' },
    { VERCEL_GIT_COMMIT_REF: 'main' },
    { VERCEL_GIT_COMMIT_REF: undefined },
    { STAGING_GMAIL_APP_PASSWORD: undefined },
    { STAGING_EMAIL_ALLOWED_RECIPIENTS: undefined },
  ]) {
    assert.deepEqual(await statusWith({ ...gmail, RESEND_API_KEY: 'synthetic-resend', ...override }), {
      providerConfigured: false, state: 'not_configured',
    });
  }
});

test('empty optional staging selector keeps the existing Resend configuration usable', async () => {
  assert.deepEqual(await statusWith({
    STAGING_EMAIL_PROVIDER: '', RESEND_API_KEY: 'synthetic-resend', EMAIL_FROM: 'sender@example.test',
  }), { providerConfigured: true, state: 'ready' });
});
