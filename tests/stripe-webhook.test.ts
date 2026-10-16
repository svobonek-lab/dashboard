import test from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';

import {
  createStripeWebhookHandler,
  verifyStripeEvent,
  type StripeSubscriptionUpdate,
} from '../api/_billing/stripe-webhook.ts';

process.env.STRIPE_WEBHOOK_SECRET = 'whsec_unit_test_only';

function responseRecorder() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) { this.headers[name] = value; return this; },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

function checkoutEvent(): Stripe.Event {
  return {
    id: 'evt_checkout_1',
    object: 'event',
    api_version: '2026-09-30.clover',
    created: 1_800_000_000,
    data: {
      object: {
        id: 'cs_test_1',
        object: 'checkout.session',
        client_reference_id: '10000000-0000-4000-8000-000000000001',
        customer: 'cus_checkout_1',
        mode: 'subscription',
        payment_status: 'paid',
        subscription: 'sub_checkout_1',
        metadata: {},
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type: 'checkout.session.completed',
  } as unknown as Stripe.Event;
}

function subscriptionEvent(type: 'customer.subscription.updated' | 'customer.subscription.deleted'): Stripe.Event {
  return {
    id: type.endsWith('deleted') ? 'evt_deleted_1' : 'evt_updated_1',
    object: 'event',
    api_version: '2026-09-30.clover',
    created: 1_800_000_100,
    data: {
      object: {
        id: 'sub_checkout_1',
        object: 'subscription',
        customer: 'cus_checkout_1',
        status: type.endsWith('deleted') ? 'canceled' : 'past_due',
        metadata: { tenant_id: '10000000-0000-4000-8000-000000000001' },
        items: {
          object: 'list',
          data: [
            { id: 'si_1', object: 'subscription_item', current_period_end: 1_800_086_400 },
            { id: 'si_2', object: 'subscription_item', current_period_end: 1_800_172_800 },
          ],
          has_more: false,
          url: '/v1/subscription_items',
        },
      },
    },
    livemode: false,
    pending_webhooks: 1,
    request: null,
    type,
  } as unknown as Stripe.Event;
}

test('cryptographically verifies the exact raw body with the Stripe endpoint secret', () => {
  const rawBody = Buffer.from(JSON.stringify(checkoutEvent()), 'utf8');
  const endpointSecret = 'whsec_test_only_123456789';
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: rawBody.toString('utf8'), secret: endpointSecret });

  assert.equal(verifyStripeEvent(rawBody, signature, endpointSecret).id, 'evt_checkout_1');
  assert.throws(() => verifyStripeEvent(Buffer.concat([rawBody, Buffer.from(' ')]), signature, endpointSecret));
});

test('rejects an invalid Stripe signature with 400 before any database call', async () => {
  let databaseCalls = 0;
  const handler = createStripeWebhookHandler({
    verifyEvent: () => { throw new Error('bad signature'); },
    applySubscriptionUpdate: async () => { databaseCalls += 1; return 'applied'; },
  });
  const response = responseRecorder();

  await handler({ method: 'POST', headers: { 'stripe-signature': 'invalid' }, body: Buffer.from('{}') }, response);

  assert.equal(response.statusCode, 400);
  assert.equal(databaseCalls, 0);
});

test('rejects missing signatures, parsed bodies and oversized payloads before persistence', async () => {
  let verificationCalls = 0;
  let databaseCalls = 0;
  const handler = createStripeWebhookHandler({
    verifyEvent: () => { verificationCalls += 1; return checkoutEvent(); },
    applySubscriptionUpdate: async () => { databaseCalls += 1; return 'applied'; },
  });

  const missingSignature = responseRecorder();
  await handler({ method: 'POST', headers: {}, body: Buffer.from('{}') }, missingSignature);
  assert.equal(missingSignature.statusCode, 400);

  const parsedBody = responseRecorder();
  await handler({ method: 'POST', headers: { 'stripe-signature': 'valid' }, body: {} }, parsedBody);
  assert.equal(parsedBody.statusCode, 400);
  assert.deepEqual(parsedBody.body, { received: false, code: 'STRIPE_RAW_BODY_REQUIRED' });

  const tooLarge = responseRecorder();
  await handler({ method: 'POST', headers: { 'stripe-signature': 'valid' }, body: Buffer.alloc(1024 * 1024 + 1) }, tooLarge);
  assert.equal(tooLarge.statusCode, 413);
  assert.equal(verificationCalls, 0);
  assert.equal(databaseCalls, 0);
});

test('rejects non-POST requests with the allowed method header', async () => {
  const handler = createStripeWebhookHandler({
    verifyEvent: () => checkoutEvent(),
    applySubscriptionUpdate: async () => 'applied',
  });
  const response = responseRecorder();

  await handler({ method: 'GET', headers: {} }, response);

  assert.equal(response.statusCode, 405);
  assert.equal(response.headers.Allow, 'POST');
});

test('fails closed when the Stripe endpoint secret is absent', async () => {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  delete process.env.STRIPE_WEBHOOK_SECRET;
  try {
    const handler = createStripeWebhookHandler({
      verifyEvent: () => checkoutEvent(),
      applySubscriptionUpdate: async () => 'applied',
    });
    const response = responseRecorder();
    await handler({ method: 'POST', headers: { 'stripe-signature': 'valid' }, body: Buffer.from('{}') }, response);
    assert.equal(response.statusCode, 500);
    assert.deepEqual(response.body, { received: false, code: 'STRIPE_WEBHOOK_NOT_CONFIGURED' });
  } finally {
    process.env.STRIPE_WEBHOOK_SECRET = secret;
  }
});

test('applies checkout completion to the tenant bound in the signed event', async () => {
  const updates: StripeSubscriptionUpdate[] = [];
  const handler = createStripeWebhookHandler({
    verifyEvent: () => checkoutEvent(),
    applySubscriptionUpdate: async (update) => { updates.push(update); return 'applied'; },
  });
  const response = responseRecorder();

  await handler({ method: 'POST', headers: { 'stripe-signature': 'valid' }, body: Buffer.from('{}') }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(updates, [{
    eventId: 'evt_checkout_1',
    eventType: 'checkout.session.completed',
    eventCreatedAt: '2027-01-15T08:00:00.000Z',
    tenantId: '10000000-0000-4000-8000-000000000001',
    customerId: 'cus_checkout_1',
    subscriptionId: 'sub_checkout_1',
    subscriptionStatus: 'active',
    currentPeriodEnd: null,
  }]);
});

test('does not activate an unpaid checkout session', async () => {
  const event = checkoutEvent();
  (event.data.object as Stripe.Checkout.Session).payment_status = 'unpaid';
  const updates: StripeSubscriptionUpdate[] = [];
  const handler = createStripeWebhookHandler({
    verifyEvent: () => event,
    applySubscriptionUpdate: async (update) => { updates.push(update); return 'applied'; },
  });
  const response = responseRecorder();
  await handler({ method: 'POST', headers: { 'stripe-signature': 'valid' }, body: Buffer.from('{}') }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(updates[0]?.subscriptionStatus, 'past_due');
});

test('rejects conflicting signed checkout tenant bindings without touching the database', async () => {
  const event = checkoutEvent();
  (event.data.object as Stripe.Checkout.Session).metadata = { tenant_id: '20000000-0000-4000-8000-000000000002' };
  let databaseCalls = 0;
  const handler = createStripeWebhookHandler({
    verifyEvent: () => event,
    applySubscriptionUpdate: async () => { databaseCalls += 1; return 'applied'; },
  });
  const response = responseRecorder();
  await handler({ method: 'POST', headers: { 'stripe-signature': 'valid' }, body: Buffer.from('{}') }, response);
  assert.equal(response.statusCode, 500);
  assert.equal(databaseCalls, 0);
});

test('maps subscription updates and the latest item period end without inventing tenant data', async () => {
  const updates: StripeSubscriptionUpdate[] = [];
  const handler = createStripeWebhookHandler({
    verifyEvent: () => subscriptionEvent('customer.subscription.updated'),
    applySubscriptionUpdate: async (update) => { updates.push(update); return 'applied'; },
  });
  const response = responseRecorder();

  await handler({ method: 'POST', headers: { 'stripe-signature': 'valid' }, body: Buffer.from('{}') }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(updates[0]?.subscriptionStatus, 'past_due');
  assert.equal(updates[0]?.currentPeriodEnd, '2027-01-17T08:00:00.000Z');
  assert.equal(updates[0]?.tenantId, '10000000-0000-4000-8000-000000000001');
});

test('maps subscription deletion to canceled', async () => {
  const updates: StripeSubscriptionUpdate[] = [];
  const handler = createStripeWebhookHandler({
    verifyEvent: () => subscriptionEvent('customer.subscription.deleted'),
    applySubscriptionUpdate: async (update) => { updates.push(update); return 'applied'; },
  });
  const response = responseRecorder();

  await handler({ method: 'POST', headers: { 'stripe-signature': 'valid' }, body: Buffer.from('{}') }, response);

  assert.equal(response.statusCode, 200);
  assert.equal(updates[0]?.subscriptionStatus, 'canceled');
});

test('returns 500 when the subscription update cannot be persisted so Stripe retries', async () => {
  const handler = createStripeWebhookHandler({
    verifyEvent: () => subscriptionEvent('customer.subscription.updated'),
    applySubscriptionUpdate: async () => { throw new Error('database unavailable'); },
  });
  const response = responseRecorder();

  await handler({ method: 'POST', headers: { 'stripe-signature': 'valid' }, body: Buffer.from('{}') }, response);

  assert.equal(response.statusCode, 500);
  assert.deepEqual(response.body, { received: false, code: 'STRIPE_WEBHOOK_PROCESSING_FAILED' });
});

test('acknowledges unhandled and duplicate events without a second mutation', async () => {
  let calls = 0;
  const handler = createStripeWebhookHandler({
    verifyEvent: () => ({ ...checkoutEvent(), type: 'invoice.created' } as Stripe.Event),
    applySubscriptionUpdate: async () => { calls += 1; return 'duplicate'; },
  });
  const response = responseRecorder();
  await handler({ method: 'POST', headers: { 'stripe-signature': 'valid' }, body: Buffer.from('{}') }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(calls, 0);

  const duplicateHandler = createStripeWebhookHandler({
    verifyEvent: () => checkoutEvent(),
    applySubscriptionUpdate: async () => 'duplicate',
  });
  const duplicateResponse = responseRecorder();
  await duplicateHandler({ method: 'POST', headers: { 'stripe-signature': 'valid' }, body: Buffer.from('{}') }, duplicateResponse);
  assert.equal(duplicateResponse.statusCode, 200);
  assert.deepEqual(duplicateResponse.body, { received: true, result: 'duplicate' });
});
