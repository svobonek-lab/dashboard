import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createStripeCheckoutHandler, type CheckoutDependencies } from '../api/stripe-checkout.ts';

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
    authorizeOwner: async () => ({ userId: '20000000-0000-4000-8000-000000000002', companyId: tenantId, customerId: null }),
    createSession: async (input) => ({ url: 'https://checkout.stripe.com/c/pay_test', input }),
    config: () => ({ secretKey: 'sk_test_unitonly', priceId: 'price_testunitonly', returnUrl: 'https://preview.example.com' }),
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

  await handler({ method: 'POST', headers: { authorization: 'Bearer invalid' }, body: {} }, response);

  assert.equal(response.statusCode, 403);
  assert.deepEqual(response.body, { code: 'BILLING_ACCESS_DENIED' });
  assert.equal(stripeCalls, 0);
});

test('checkout binds the server-approved price and tenant to the Stripe session', async () => {
  let captured: any;
  const handler = createStripeCheckoutHandler(dependencies({
    createSession: async (input) => { captured = input; return { url: 'https://checkout.stripe.com/c/pay_test' }; },
  }));
  const response = responseRecorder();

  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: { priceId: 'price_attacker' } }, response);

  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.body, { url: 'https://checkout.stripe.com/c/pay_test' });
  assert.equal(captured?.client_reference_id, tenantId);
  assert.deepEqual(captured?.metadata, { tenant_id: tenantId });
  assert.deepEqual(captured?.line_items, [{ price: 'price_testunitonly', quantity: 1 }]);
  assert.deepEqual(captured?.subscription_data, { metadata: { tenant_id: tenantId } });
});

test('checkout fails closed when server billing configuration is absent', async () => {
  let stripeCalls = 0;
  const handler = createStripeCheckoutHandler(dependencies({
    config: () => ({ secretKey: '', priceId: '', returnUrl: '' }),
    createSession: async () => { stripeCalls += 1; return { url: 'https://checkout.stripe.com/c/never' }; },
  }));
  const response = responseRecorder();

  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' }, body: {} }, response);

  assert.equal(response.statusCode, 503);
  assert.deepEqual(response.body, { code: 'BILLING_NOT_CONFIGURED' });
  assert.equal(stripeCalls, 0);
});

test('the live authorizer derives tenant scope from one active owner membership', () => {
  const source = readFileSync(new URL('../api/stripe-checkout.ts', import.meta.url), 'utf8');
  assert.match(source, /auth\.getUser\(token\)/);
  assert.match(source, /from\('app_members'\)[\s\S]+eq\('user_id', authData\.user\.id\)[\s\S]+eq\('active', true\)[\s\S]+eq\('role', 'owner'\)/);
  assert.match(source, /memberships\.length !== 1/);
  assert.match(source, /from\('app_companies'\)[\s\S]+eq\('id', companyId\)[\s\S]+eq\('active', true\)/);
  assert.doesNotMatch(source, /request\.body\?\.price|body\.priceId/);
});
