import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createStripeCheckoutHandler, readBillingConfig, type CheckoutDependencies } from '../api/_billing/stripe-checkout.ts';

function responseRecorder() {
  return {
    statusCode: 200,
    body: undefined as unknown,
    setHeader() {},
    status(code: number) {
      this.statusCode = code;
      return { json: (value: unknown) => { this.body = value; } };
    },
  };
}

const tenantId = '10000000-0000-4000-8000-000000000001';

function dependencies(overrides: Partial<CheckoutDependencies> = {}): CheckoutDependencies {
  return {
    authorizeOwner: async () => ({ userId: '20000000-0000-4000-8000-000000000002', companyId: tenantId, customerId: null, plan: 'starter', email: 'owner@example.invalid' }),
    createCustomer: async () => ({ id: 'cus_testunitonly' }),
    bindCustomer: async () => undefined,
    createSession: async (input) => ({ url: 'https://checkout.stripe.com/c/pay_test', input }),
    config: () => ({
      secretKey: 'rk_test_unitonly', returnUrl: 'https://preview.example.com', mode: 'test',
      prices: { pilot: 'price_testunitonly', starter: 'price_starter', growth: 'price_growth', pro: 'price_pro' },
    }),
    ...overrides,
  };
}

test('checkout requires a verified owner bearer session before calling Stripe', async () => {
  let stripeCalls = 0;
  const handler = createStripeCheckoutHandler(dependencies({
    authorizeOwner: async () => { throw Object.assign(new Error('denied'), { status: 403, code: 'BILLING_ACCESS_DENIED' }); },
    createSession: async () => { stripeCalls += 1; return { url: 'https://checkout.stripe.com/c/never' }; },
  }));
  const response = responseRecorder();

  await handler({ method: 'POST', headers: { authorization: 'Bearer invalid', 'x-stavbaflow-idempotency-key': '30000000-0000-4000-8000-000000000003' } }, response);

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { code: 'BILLING_ACCESS_DENIED' });
  assert.equal(stripeCalls, 0);
});

test('checkout creates and binds a customer, then binds the server-approved plan and tenant', async () => {
  let captured: any;
  let customerInput: any;
  let bound: unknown[] = [];
  let sessionIdempotency = '';
  const handler = createStripeCheckoutHandler(dependencies({
    createCustomer: async (input, _key, idempotencyKey) => {
      customerInput = { input, idempotencyKey };
      return { id: 'cus_testunitonly' };
    },
    bindCustomer: async (...args) => { bound = args; },
    createSession: async (input, _key, idempotencyKey) => {
      captured = input; sessionIdempotency = idempotencyKey;
      return { url: 'https://checkout.stripe.com/c/pay_test' };
    },
  }));
  const response = responseRecorder();

  await handler({ method: 'POST', headers: {
    authorization: 'Bearer valid', 'x-stavbaflow-idempotency-key': '30000000-0000-4000-8000-000000000003',
  }, body: { priceId: 'price_attacker' } }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { url: 'https://checkout.stripe.com/c/pay_test' });
  assert.deepEqual(customerInput, {
    input: { email: 'owner@example.invalid', metadata: { tenant_id: tenantId } },
    idempotencyKey: `customer:${tenantId}`,
  });
  assert.deepEqual(bound, [tenantId, 'cus_testunitonly']);
  assert.equal(captured?.customer, 'cus_testunitonly');
  assert.deepEqual(captured?.managed_payments, { enabled: false });
  assert.equal(captured?.client_reference_id, tenantId);
  assert.deepEqual(captured?.metadata, { tenant_id: tenantId, plan: 'starter' });
  assert.deepEqual(captured?.line_items, [{ price: 'price_starter', quantity: 1 }]);
  assert.deepEqual(captured?.subscription_data, { metadata: { tenant_id: tenantId, plan: 'starter' } });
  assert.equal(sessionIdempotency, `checkout:billing-v1:${tenantId}:30000000-0000-4000-8000-000000000003`);
});

test('checkout reuses an existing Stripe customer without creating or rebinding it', async () => {
  let customerCalls = 0;
  let bindCalls = 0;
  let captured: any;
  const handler = createStripeCheckoutHandler(dependencies({
    authorizeOwner: async () => ({ userId: 'owner-a', companyId: tenantId, customerId: 'cus_existing', plan: 'growth' }),
    createCustomer: async () => { customerCalls += 1; return { id: 'cus_never' }; },
    bindCustomer: async () => { bindCalls += 1; },
    createSession: async (input) => { captured = input; return { url: 'https://checkout.stripe.com/c/pay_test' }; },
  }));
  const response = responseRecorder();
  await handler({ method: 'POST', headers: {
    authorization: 'Bearer valid', 'x-stavbaflow-idempotency-key': '40000000-0000-4000-8000-000000000004',
  } }, response);
  assert.equal(response.statusCode, 200);
  assert.equal(captured.customer, 'cus_existing');
  assert.deepEqual(captured.line_items, [{ price: 'price_growth', quantity: 1 }]);
  assert.equal(customerCalls, 0);
  assert.equal(bindCalls, 0);
});

test('checkout fails closed when server billing configuration is absent', async () => {
  let stripeCalls = 0;
  const handler = createStripeCheckoutHandler(dependencies({
    config: () => ({ secretKey: '', returnUrl: '', mode: 'test', prices: { pilot: '', starter: '', growth: '', pro: '' } }),
    createSession: async () => { stripeCalls += 1; return { url: 'https://checkout.stripe.com/c/never' }; },
  }));
  const response = responseRecorder();

  await handler({ method: 'POST', headers: { authorization: 'Bearer valid', 'x-stavbaflow-idempotency-key': '30000000-0000-4000-8000-000000000003' } }, response);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, { code: 'BILLING_NOT_CONFIGURED' });
  assert.equal(stripeCalls, 0);
});

test('each supported monthly plan maps to exactly its configured Stripe price', async () => {
  for (const [plan, expectedPrice] of [['starter', 'price_starter'], ['growth', 'price_growth'], ['pro', 'price_pro']] as const) {
    let captured: any;
    const handler = createStripeCheckoutHandler(dependencies({
      authorizeOwner: async () => ({ userId: 'owner-a', companyId: tenantId, customerId: 'cus_existing', plan }),
      createSession: async (input) => { captured = input; return { url: 'https://checkout.stripe.com/c/pay_test' }; },
    }));
    const response = responseRecorder();
    await handler({ method: 'POST', headers: {
      authorization: 'Bearer valid', 'x-stavbaflow-idempotency-key': '50000000-0000-4000-8000-000000000005',
    } }, response);
    assert.equal(response.statusCode, 200, `${plan} should be purchasable when configured`);
    assert.deepEqual(captured.line_items, [{ price: expectedPrice, quantity: 1 }]);
    assert.equal(captured.metadata.plan, plan);
  }
});

test('pilot cannot be purchased as a subscription even when a legacy pilot price exists', async () => {
  let stripeCalls = 0;
  const handler = createStripeCheckoutHandler(dependencies({
    authorizeOwner: async () => ({ userId: 'owner-a', companyId: tenantId, customerId: null, plan: 'pilot' }),
    createCustomer: async () => { stripeCalls += 1; return { id: 'cus_unexpected' }; },
    createSession: async () => { stripeCalls += 1; return { url: 'https://checkout.stripe.com/c/never' }; },
  }));
  const response = responseRecorder();
  await handler({ method: 'POST', headers: {
    authorization: 'Bearer valid', 'x-stavbaflow-idempotency-key': '60000000-0000-4000-8000-000000000006',
  } }, response);
  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.body, { code: 'BILLING_PLAN_UNAVAILABLE' });
  assert.equal(stripeCalls, 0);
});

test('Profi fails closed with BILLING_PLAN_UNAVAILABLE when its Stripe price is missing', async () => {
  let stripeCalls = 0;
  const handler = createStripeCheckoutHandler(dependencies({
    authorizeOwner: async () => ({ userId: 'owner-a', companyId: tenantId, customerId: null, plan: 'pro' }),
    config: () => ({ secretKey: 'rk_test_unitonly', returnUrl: 'https://preview.example.com', mode: 'test',
      prices: { pilot: 'price_legacy', starter: 'price_starter', growth: 'price_growth', pro: '' } }),
    createCustomer: async () => { stripeCalls += 1; return { id: 'cus_unexpected' }; },
    createSession: async () => { stripeCalls += 1; return { url: 'https://checkout.stripe.com/c/never' }; },
  }));
  const response = responseRecorder();
  await handler({ method: 'POST', headers: {
    authorization: 'Bearer valid', 'x-stavbaflow-idempotency-key': '70000000-0000-4000-8000-000000000007',
  } }, response);
  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.body, { code: 'BILLING_PLAN_UNAVAILABLE' });
  assert.equal(stripeCalls, 0);
});

test('billing config reads Profi only from STRIPE_PRICE_PRO_ID', () => {
  const previousPro = process.env.STRIPE_PRICE_PRO_ID;
  const previousPilot = process.env.STRIPE_PRICE_PILOT_ID;
  try {
    process.env.STRIPE_PRICE_PRO_ID = 'price_env_pro';
    process.env.STRIPE_PRICE_PILOT_ID = 'price_env_legacy_pilot';
    const config = readBillingConfig();
    assert.equal(config.prices.pro, 'price_env_pro');
    assert.equal(config.prices.pilot, 'price_env_legacy_pilot');
  } finally {
    if (previousPro === undefined) delete process.env.STRIPE_PRICE_PRO_ID;
    else process.env.STRIPE_PRICE_PRO_ID = previousPro;
    if (previousPilot === undefined) delete process.env.STRIPE_PRICE_PILOT_ID;
    else process.env.STRIPE_PRICE_PILOT_ID = previousPilot;
  }
});

test('the live authorizer derives tenant scope from one active owner membership', () => {
  const source = readFileSync(new URL('../api/_billing/stripe-checkout.ts', import.meta.url), 'utf8');
  assert.match(source, /auth\.getUser\(token\)/);
  assert.match(source, /from\('app_members'\)[\s\S]+eq\('user_id', authData\.user\.id\)[\s\S]+eq\('active', true\)[\s\S]+eq\('role', 'owner'\)/);
  assert.match(source, /memberships\.length !== 1/);
  assert.match(source, /from\('app_companies'\)[\s\S]+eq\('id', companyId\)[\s\S]+eq\('active', true\)/);
  assert.doesNotMatch(source, /request\.body\?\.price|body\.priceId/);
  assert.match(source, /STRIPE_PRICE_PRO_ID/);
  assert.doesNotMatch(source, /['"]price_[A-Za-z0-9]{6,}['"]/);
});
