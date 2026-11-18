import assert from 'node:assert/strict';
import test from 'node:test';
import { createGmailSmtpProvider } from '../api/_gmail-smtp-provider';
import { deliverClaimedOutboxEmail, EmailProviderError, type OutboxEmail } from '../api/_outbox-worker';

const config = {
  kind: 'gmail_smtp' as const,
  user: 'sender@example.test',
  appPassword: 'synthetic-password',
  from: 'sender@example.test',
  allowedRecipients: ['owner-a@example.test', 'owner-b@example.test', 'employee-a@example.test', 'employee-b@example.test'],
};
const email: OutboxEmail = { id: 'mail-1', recipient: 'owner-a@example.test', subject: 'Invite', body: 'Synthetic', attempts: 1 };

test('Gmail SMTP rejects an unlisted recipient before sending', async () => {
  let calls = 0;
  const provider = createGmailSmtpProvider(config, { async sendMail() { calls++; return { messageId: 'sent-1', accepted: [], rejected: [] }; } });
  await assert.rejects(provider.send({ ...email, recipient: 'other@example.test' }, 'outbox/mail-1'), (error: unknown) => {
    assert.ok(error instanceof EmailProviderError);
    assert.equal(error.code, 'EMAIL_PROVIDER_REJECTED');
    assert.equal(error.retryable, false);
    return true;
  });
  assert.equal(calls, 0);
});

test('Gmail SMTP records an accepted provider ID for an allowlisted address', async () => {
  const provider = createGmailSmtpProvider(config, { async sendMail(options) {
    assert.equal(options.to, 'owner-b@example.test');
    assert.equal(options.from, 'sender@example.test');
    assert.equal(options.subject, 'Invite');
    return { messageId: '<accepted@example.test>', accepted: ['owner-b@example.test'], rejected: [] };
  } });
  assert.deepEqual(await provider.send({ ...email, recipient: ' OWNER-B@EXAMPLE.TEST ' }, 'outbox/mail-1'), {
    id: '<accepted@example.test>',
  });
});

test('Gmail SMTP does not mark an unaccepted recipient as delivered', async () => {
  const provider = createGmailSmtpProvider(config, { async sendMail() {
    return { messageId: '<generated@example.test>', accepted: [], rejected: [] };
  } });
  await assert.rejects(provider.send(email, 'outbox/mail-1'), (error: unknown) => {
    assert.ok(error instanceof EmailProviderError);
    assert.equal(error.code, 'EMAIL_PROVIDER_UNCONFIRMED');
    assert.equal(error.retryable, false);
    return true;
  });
});

test('Gmail SMTP ambiguity is terminal in the existing outbox and stores only a safe code', async () => {
  const provider = createGmailSmtpProvider(config, { async sendMail() { throw new Error('private recipient or credential detail'); } });
  const failures: any[] = [];
  const result = await deliverClaimedOutboxEmail(email, {
    provider,
    store: { async markDelivered() { throw new Error('unexpected delivery'); }, async markFailure(update) { failures.push(update); } },
  });
  assert.deepEqual(result, { status: 'failed', errorCode: 'EMAIL_PROVIDER_UNCONFIRMED' });
  assert.equal(failures.length, 1);
  assert.equal(failures[0].lastError, 'EMAIL_PROVIDER_UNCONFIRMED');
  assert.equal(failures[0].status, 'failed');
  assert.doesNotMatch(JSON.stringify(failures), /private recipient|credential detail/);
});

test('Gmail SMTP treats a definite envelope rejection as terminal', async () => {
  const provider = createGmailSmtpProvider(config, { async sendMail() {
    const error = new Error('private address');
    Object.assign(error, { code: 'EENVELOPE' });
    throw error;
  } });
  await assert.rejects(provider.send(email, 'outbox/mail-1'), (error: unknown) => {
    assert.ok(error instanceof EmailProviderError);
    assert.equal(error.code, 'EMAIL_PROVIDER_REJECTED');
    assert.equal(error.retryable, false);
    return true;
  });
});
