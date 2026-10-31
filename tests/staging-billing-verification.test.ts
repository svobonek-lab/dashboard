import test from 'node:test';
import assert from 'node:assert/strict';
import { assertCompanyBCheckoutAcceptance } from '../scripts/staging-billing-verification.mjs';

const fixture = {
  companyId: 'b7f07d92-30b6-4894-9751-2b64e1ed4897',
  company: {
    id: 'b7f07d92-30b6-4894-9751-2b64e1ed4897',
    slug: 'e2e-synthetic-company-b',
    active: true,
    plan: 'pilot',
    subscription_status: 'active',
    stripe_customer_id: 'cus_test_company_b',
    stripe_subscription_id: 'sub_test_company_b',
  },
  customer: {
    id: 'cus_test_company_b',
    livemode: false,
    deleted: false,
    test_clock: 'clock_test_company_b',
    metadata: { tenant_id: 'b7f07d92-30b6-4894-9751-2b64e1ed4897', purpose: 'staging-past-due-acceptance' },
  },
  subscription: {
    id: 'sub_test_company_b',
    status: 'active',
    livemode: false,
    customer: 'cus_test_company_b',
    test_clock: 'clock_test_company_b',
    metadata: { tenant_id: 'b7f07d92-30b6-4894-9751-2b64e1ed4897', purpose: 'staging-past-due-acceptance' },
  },
  checkout: {
    id: 'cs_test_company_b',
    livemode: false,
    mode: 'subscription',
    status: 'complete',
    customer: 'cus_test_company_b',
    subscription: 'sub_test_company_b',
    metadata: { tenant_id: 'b7f07d92-30b6-4894-9751-2b64e1ed4897', plan: 'pilot' },
  },
};

test('accepts only an active company B subscription bound to a completed TEST Checkout', () => {
  assert.doesNotThrow(() => assertCompanyBCheckoutAcceptance(fixture));
});

test('rejects a company that is not active after payment', () => {
  assert.throws(
    () => assertCompanyBCheckoutAcceptance({
      ...fixture,
      company: { ...fixture.company, subscription_status: 'canceled' },
    }),
    /company B is not active/i,
  );
});

test('rejects a Checkout session for another company or subscription', () => {
  assert.throws(
    () => assertCompanyBCheckoutAcceptance({
      ...fixture,
      checkout: { ...fixture.checkout, subscription: 'sub_other_tenant' },
    }),
    /checkout session is not bound/i,
  );
});
