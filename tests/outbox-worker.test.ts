import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deliverClaimedOutboxEmail,
  createResendEmailProvider,
  EmailProviderError,
  isRecoverableOutboxClaim,
  retryDelayMs,
} from '../api/_outbox-worker.js';

const message = {
  id: 'email-1',
  recipient: 'owner@example.test',
  subject: 'Invitation',
  body: 'You have an invitation.',
  body_html: null,
  attempts: 1,
};

function harness(send: () => Promise<{ id: string }>) {
  const updates: Array<Record<string, unknown>> = [];
  return {
    updates,
    provider: { send },
    store: {
      async markDelivered(id: string, providerMessageId: string, deliveredAt: string) {
        updates.push({ id, status: 'delivered', providerMessageId, deliveredAt });
      },
      async markFailure(update: Record<string, unknown>) {
        updates.push(update);
      },
    },
  };
}

test('marks a successfully sent claimed email as delivered', async () => {
  const h = harness(async () => ({ id: 'provider-1' }));
  const result = await deliverClaimedOutboxEmail(message, {
    provider: h.provider,
    store: h.store,
    now: () => new Date('2026-11-03T12:00:00.000Z'),
  });

  assert.equal(result.status, 'delivered');
  assert.deepEqual(h.updates, [{
    id: 'email-1',
    status: 'delivered',
    providerMessageId: 'provider-1',
    deliveredAt: '2026-11-03T12:00:00.000Z',
  }]);
});

test('schedules a temporary provider failure with exponential backoff then allows success', async () => {
  let sends = 0;
  const h = harness(async () => {
    sends += 1;
    if (sends === 1) throw new EmailProviderError('EMAIL_PROVIDER_TEMPORARY', true);
    return { id: 'provider-2' };
  });
  const now = () => new Date('2026-11-03T12:00:00.000Z');

  const first = await deliverClaimedOutboxEmail(message, { provider: h.provider, store: h.store, now });
  assert.equal(first.status, 'retry');
  assert.deepEqual(h.updates[0], {
    id: 'email-1',
    status: 'retry',
    attempts: 1,
    lastError: 'EMAIL_PROVIDER_TEMPORARY',
    scheduledFor: new Date(now().getTime() + 60_000).toISOString(),
  });

  const second = await deliverClaimedOutboxEmail({ ...message, attempts: 2 }, {
    provider: h.provider,
    store: h.store,
    now,
  });
  assert.equal(second.status, 'delivered');
  assert.equal(sends, 2);
});

test('marks a permanent provider failure failed without retrying', async () => {
  const h = harness(async () => { throw new EmailProviderError('EMAIL_PROVIDER_REJECTED', false); });
  const result = await deliverClaimedOutboxEmail(message, {
    provider: h.provider,
    store: h.store,
    now: () => new Date('2026-11-03T12:00:00.000Z'),
  });

  assert.equal(result.status, 'failed');
  assert.deepEqual(h.updates[0], {
    id: 'email-1',
    status: 'failed',
    attempts: 1,
    lastError: 'EMAIL_PROVIDER_REJECTED',
  });
});

test('stores only safe provider failure codes', async () => {
  const h = harness(async () => { throw new EmailProviderError('private@example.test', true); });
  const result = await deliverClaimedOutboxEmail(message, {
    provider: h.provider,
    store: h.store,
    now: () => new Date('2026-11-03T12:00:00.000Z'),
  });

  assert.equal(result.errorCode, 'EMAIL_PROVIDER_TEMPORARY');
  assert.equal(h.updates[0].lastError, 'EMAIL_PROVIDER_TEMPORARY');
  assert.doesNotMatch(JSON.stringify(h.updates), /private@example/);
});

test('caps retryable deliveries at five attempts and increases delay exponentially', async () => {
  assert.deepEqual([1, 2, 3, 4].map(retryDelayMs), [60_000, 120_000, 240_000, 480_000]);
  const h = harness(async () => { throw new EmailProviderError('EMAIL_PROVIDER_TEMPORARY', true); });
  const result = await deliverClaimedOutboxEmail({ ...message, attempts: 5 }, {
    provider: h.provider,
    store: h.store,
    now: () => new Date('2026-11-03T12:00:00.000Z'),
  });

  assert.equal(result.status, 'failed');
  assert.equal(h.updates[0].status, 'failed');
  assert.equal(h.updates[0].attempts, 5);
});

test('recovers stale legacy sending claims as well as current processing claims', () => {
  const staleBefore = '2026-11-03T10:00:00.000Z';
  assert.equal(isRecoverableOutboxClaim('sending', '2026-11-03T09:45:00.000Z', staleBefore), true);
  assert.equal(isRecoverableOutboxClaim('processing', '2026-11-03T09:45:00.000Z', staleBefore), true);
  assert.equal(isRecoverableOutboxClaim('sending', '2026-11-03T10:00:01.000Z', staleBefore), false);
  assert.equal(isRecoverableOutboxClaim('pending', '2026-11-03T09:45:00.000Z', staleBefore), false);
});

test('Resend transport classifies rate limits as retryable and keeps request idempotent', async () => {
  let receivedKey = '';
  const provider = createResendEmailProvider('synthetic-key', 'StavbaFlow <sender@example.test>', async (_url, init) => {
    receivedKey = new Headers(init?.headers).get('Idempotency-Key') || '';
    return new Response(JSON.stringify({ message: 'too many requests' }), { status: 429 });
  });

  await assert.rejects(provider.send(message, 'outbox/email-1'), (error: unknown) => {
    assert.ok(error instanceof EmailProviderError);
    assert.equal(error.code, 'EMAIL_PROVIDER_RATE_LIMITED');
    assert.equal(error.retryable, true);
    return true;
  });
  assert.equal(receivedKey, 'outbox/email-1');
});

test('Resend transport treats permanent rejection as non-retryable without storing provider details', async () => {
  const provider = createResendEmailProvider('synthetic-key', 'StavbaFlow <sender@example.test>', async () => (
    new Response(JSON.stringify({ message: 'private recipient detail' }), { status: 400 })
  ));

  await assert.rejects(provider.send(message, 'outbox/email-1'), (error: unknown) => {
    assert.ok(error instanceof EmailProviderError);
    assert.equal(error.code, 'EMAIL_PROVIDER_REJECTED');
    assert.equal(error.retryable, false);
    assert.doesNotMatch(error.message, /private recipient detail/);
    return true;
  });
});
