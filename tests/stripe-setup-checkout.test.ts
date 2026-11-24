import assert from 'node:assert/strict';
import test from 'node:test';

import {
  createSetupCheckoutInput,
  createStripeSetupCheckoutHandler,
  SETUP_FEE_AMOUNT,
  SETUP_FEE_OFFER_VERSION,
  type SetupCheckoutDependencies,
} from '../api/_billing/stripe-setup-checkout.ts';
import type { OwnerBillingIdentity } from '../api/_billing/stripe-checkout.ts';

const companyId = '10000000-0000-4000-8000-000000000001';
const requestId = '30000000-0000-4000-8000-000000000003';

function responseRecorder() {
  return {
    statusCode: 0,
    body: undefined as unknown,
    headers: {} as Record<string, string>,
    setHeader(name: string, value: string) { this.headers[name] = value; },
    status(code: number) { this.statusCode = code; return this; },
    json(body: unknown) { this.body = body; return this; },
  };
}

function owner(overrides: Partial<OwnerBillingIdentity> = {}): OwnerBillingIdentity {
  return {
    userId: '20000000-0000-4000-8000-000000000002',
    companyId,
    customerId: null,
    plan: 'pilot',
    subscriptionStatus: 'not_configured',
    email: 'owner@example.cz',
    ...overrides,
  };
}

function dependencies(overrides: Partial<SetupCheckoutDependencies> = {}): SetupCheckoutDependencies {
  return {
    enabled: () => true,
    authorizeOwner: async () => owner(),
    createCustomer: async () => ({ id: 'cus_testsetup' }),
    bindCustomer: async () => undefined,
    createSession: async () => ({ id: 'cs_testsetup', url: 'https://checkout.stripe.com/c/pay_test', status: 'open' }),
    config: () => ({
      secretKey: 'rk_test_unitonly', publicAppUrl: 'https://app.example.cz', mode: 'test',
      prices: { pilot: '', starter: '', growth: '', pro: '' },
    }),
    ...overrides,
  };
}

function request() {
  return {
    method: 'POST',
    headers: { authorization: 'Bearer verified-owner-session', 'x-stavbaflow-idempotency-key': requestId },
  };
}

test('setup Checkout input is a fixed one-time CZK offer bound to the authorized workspace', () => {
  const input = createSetupCheckoutInput(owner(), 'cus_testsetup', 'https://app.example.cz');
  assert.equal(input.mode, 'payment');
  assert.equal(input.customer, 'cus_testsetup');
  assert.equal(input.client_reference_id, companyId);
  assert.equal(input.line_items?.[0]?.price_data?.currency, 'czk');
  assert.equal(input.line_items?.[0]?.price_data?.unit_amount, SETUP_FEE_AMOUNT);
  assert.deepEqual(input.allowed_payment_method_types, ['card']);
  assert.equal(input.metadata?.tenant_id, companyId);
  assert.equal(input.metadata?.purchase_type, 'setup_fee');
  assert.equal(input.metadata?.offer_version, SETUP_FEE_OFFER_VERSION);
  assert.match(input.success_url, /kind=setup/);
  assert.match(input.cancel_url, /kind=setup/);
  assert.equal(SETUP_FEE_AMOUNT, 490_000);
});

test('setup Checkout stays disabled until explicitly enabled', async () => {
  let ownerCalls = 0;
  const handler = createStripeSetupCheckoutHandler(dependencies({
    enabled: () => false,
    authorizeOwner: async () => { ownerCalls += 1; return owner(); },
  }));
  const response = responseRecorder();
  await handler(request(), response);
  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, { code: 'SETUP_PAYMENT_DISABLED' });
  assert.equal(ownerCalls, 0);
});

test('setup Checkout requires the owner, exact unconfigured status and a stable request id', async () => {
  for (const override of [
    { authorizeOwner: async () => { throw Object.assign(new Error('denied'), { status: 403, code: 'BILLING_ACCESS_DENIED' }); } },
    { authorizeOwner: async () => owner({ subscriptionStatus: 'active' }) },
  ]) {
    let providerCalls = 0;
    const handler = createStripeSetupCheckoutHandler(dependencies({
      ...override,
      createCustomer: async () => { providerCalls += 1; return { id: 'cus_never' }; },
    }));
    const response = responseRecorder();
    await handler(request(), response);
    assert.notEqual(response.statusCode, 200);
    assert.equal(providerCalls, 0);
  }

  const invalidKeyResponse = responseRecorder();
  await createStripeSetupCheckoutHandler(dependencies())({ method: 'POST', headers: {} }, invalidKeyResponse);
  assert.equal(invalidKeyResponse.statusCode, 400);
  assert.deepEqual(invalidKeyResponse.body, { code: 'BILLING_REQUEST_ID_INVALID' });
});

test('setup Checkout creates and binds one customer and returns only the Stripe Checkout URL', async () => {
  const captured: { customer?: unknown; bound?: unknown[]; session?: unknown; sessionKey?: string } = {};
  const handler = createStripeSetupCheckoutHandler(dependencies({
    createCustomer: async (input, _secret, key) => { captured.customer = { input, key }; return { id: 'cus_testsetup' }; },
    bindCustomer: async (...args) => { captured.bound = args; },
    createSession: async (input, _secret, key) => {
      captured.session = input;
      captured.sessionKey = key;
      return { id: 'cs_testsetup', url: 'https://checkout.stripe.com/c/pay_test', status: 'open' };
    },
  }));
  const response = responseRecorder();
  await handler(request(), response);
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { url: 'https://checkout.stripe.com/c/pay_test' });
  assert.deepEqual(captured.bound, [companyId, 'cus_testsetup']);
  assert.equal((captured.session as any).line_items[0].price_data.unit_amount, SETUP_FEE_AMOUNT);
  assert.equal(captured.sessionKey, `setup-checkout:${SETUP_FEE_OFFER_VERSION}:${companyId}:${requestId}`);
});

test('setup Checkout rejects expired, complete and non-Stripe session URLs', async () => {
  for (const result of [
    { session: { id: 'cs_testsetup', url: null, status: 'expired' as const }, code: 'BILLING_SETUP_SESSION_EXPIRED', statusCode: 409 },
    { session: { id: 'cs_testsetup', url: null, status: 'complete' as const }, code: 'BILLING_SETUP_SESSION_COMPLETE', statusCode: 409 },
    { session: { id: 'cs_testsetup', url: 'https://evil.example/c/pay', status: 'open' as const }, code: 'BILLING_SESSION_FAILED', statusCode: 502 },
  ]) {
    const handler = createStripeSetupCheckoutHandler(dependencies({ createSession: async () => result.session }));
    const response = responseRecorder();
    await handler(request(), response);
    assert.equal(response.statusCode, result.statusCode);
    assert.deepEqual(response.body, { code: result.code });
  }
});
