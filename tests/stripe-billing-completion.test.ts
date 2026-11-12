import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { createStripePortalHandler } from '../api/_billing/stripe-portal.ts';

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

test('billing portal requires an authenticated owner with a bound Stripe customer', async () => {
  let portalCalls = 0;
  const handler = createStripePortalHandler({
    authorizeOwner: async () => ({ userId: 'user-a', companyId: 'company-a', customerId: null, plan: 'starter' }),
    createPortalSession: async () => { portalCalls += 1; return { url: 'https://billing.stripe.com/p/session' }; },
    config: () => ({ secretKey: 'rk_test_unit', publicAppUrl: 'https://app.example.com', mode: 'test' }),
  });
  const response = responseRecorder();
  await handler({ method: 'POST', headers: { authorization: 'Bearer valid' } }, response);
  assert.equal(response.statusCode, 409);
  assert.deepEqual(response.body, { code: 'BILLING_CUSTOMER_MISSING' });
  assert.equal(portalCalls, 0);
});

test('billing completion is plan-allowlisted, idempotent and keeps browser prices untrusted', () => {
  const checkout = readFileSync(new URL('../api/_billing/stripe-checkout.ts', import.meta.url), 'utf8');
  const platform = readFileSync(new URL('../api/_platform/routes/companies.ts', import.meta.url), 'utf8');
  const billingRouter = readFileSync(new URL('../api/billing.ts', import.meta.url), 'utf8');
  const client = readFileSync(new URL('../src/features/manage-billing/api/billingClient.ts', import.meta.url), 'utf8');
  const settings = readFileSync(new URL('../src/pages/owner/settings/ui/Settings.tsx', import.meta.url), 'utf8');
  const billingReturn = readFileSync(new URL('../src/pages/owner/billing-return/ui/BillingReturn.tsx', import.meta.url), 'utf8');
  const admin = readFileSync(new URL('../src/pages/admin/companies/ui/Companies.tsx', import.meta.url), 'utf8');
  const contract = readFileSync(new URL('../supabase/staging/20261016_stripe_billing_completion.sql', import.meta.url), 'utf8');

  assert.match(checkout, /createCustomer/);
  assert.match(checkout, /bindCustomer/);
  assert.match(checkout, /idempotencyKey/);
  assert.match(checkout, /STRIPE_PRICE_STARTER_ID/);
  assert.match(checkout, /STRIPE_PRICE_GROWTH_ID/);
  assert.match(checkout, /STRIPE_PRICE_PRO_ID/);
  assert.doesNotMatch(checkout, /body\.priceId|request\.body\?\.price/);
  assert.match(billingRouter, /route === 'portal'/);
  assert.match(client, /startBillingPortal/);
  assert.match(client, /BILLING_PLAN_UNAVAILABLE/);
  assert.match(checkout, /billing\/return\?status=success/);
  assert.match(billingReturn, /Platba byla přijata/);
  assert.match(settings, /Otevřít správu plateb/);
  assert.match(settings, /Otevírám správu plateb…/);
  assert.match(platform, /set_billing_plan/);
  assert.match(admin, /Nastavit tarif/);
  assert.match(contract, /app_platform_set_billing_plan/);
  assert.match(contract, /app_bind_stripe_customer/);
  assert.match(contract, /revoke all on function/i);
});
