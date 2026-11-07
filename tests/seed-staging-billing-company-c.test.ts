import assert from 'node:assert/strict';
import test from 'node:test';

import {
  assertBillingCompanyCWriteBranch,
  assertBillingCompanyCCanStart,
  assertStagingBillingCompanyCTarget,
  buildBillingCompanyCFixture,
} from '../scripts/seed-staging-billing-company-c.mjs';

const env = {
  STAGING_SUPABASE_URL: 'https://xwzweltjvreqhjpbjrxa.supabase.co',
  STAGING_SUPABASE_PROJECT_REF: 'xwzweltjvreqhjpbjrxa',
  PRODUCTION_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv',
  STAGING_OWNER_C_EMAIL: 'billing-owner-c@stavbaflow.example.test',
};

test('company C target accepts only the isolated StavbaCore Staging project', () => {
  assert.deepEqual(assertStagingBillingCompanyCTarget(env), {
    url: env.STAGING_SUPABASE_URL,
    ref: env.STAGING_SUPABASE_PROJECT_REF,
  });
  assert.throws(() => assertStagingBillingCompanyCTarget({
    ...env,
    STAGING_SUPABASE_PROJECT_REF: env.PRODUCTION_SUPABASE_PROJECT_REF,
    STAGING_SUPABASE_URL: `https://${env.PRODUCTION_SUPABASE_PROJECT_REF}.supabase.co`,
  }), /approved StavbaCore Staging/i);
  assert.throws(() => assertStagingBillingCompanyCTarget({
    ...env,
    STAGING_SUPABASE_URL: 'http://xwzweltjvreqhjpbjrxa.supabase.co',
  }), /approved.*Staging/i);
  assert.throws(() => assertStagingBillingCompanyCTarget({ ...env, PRODUCTION_SUPABASE_PROJECT_REF: '' }), /approved.*Staging/i);
});

test('company C seed is synthetic and starts blocked with no Stripe binding', () => {
  assert.deepEqual(buildBillingCompanyCFixture(env.STAGING_OWNER_C_EMAIL), {
    name: 'StavbaFlow Synthetic Billing Company C',
    slug: 'e2e-synthetic-company-c',
    email: env.STAGING_OWNER_C_EMAIL,
    plan: 'starter',
    active: true,
    onboarding_completed: true,
    subscription_status: 'not_configured',
  });
  assert.throws(() => buildBillingCompanyCFixture('customer@example.com'), /synthetic company C account/i);
});

test('company C seed reuses an unpaid customer but refuses an active or subscribed tenant', () => {
  assert.doesNotThrow(() => assertBillingCompanyCCanStart(null));
  assert.doesNotThrow(() => assertBillingCompanyCCanStart({
    id: '10000000-0000-4000-8000-000000000003',
    slug: 'e2e-synthetic-company-c',
    active: true,
    plan: 'starter',
    subscription_status: 'not_configured',
    stripe_customer_id: null,
    stripe_subscription_id: null,
  }));
  assert.throws(() => assertBillingCompanyCCanStart({
    slug: 'e2e-synthetic-company-c', subscription_status: 'active',
    stripe_customer_id: 'cus_test', stripe_subscription_id: 'sub_test',
  }), /already paid or bound/i);
  assert.doesNotThrow(() => assertBillingCompanyCCanStart({
    active: true, plan: 'starter',
    slug: 'e2e-synthetic-company-c', subscription_status: 'not_configured',
    stripe_customer_id: 'cus_test', stripe_subscription_id: null,
  }));
  assert.throws(() => assertBillingCompanyCCanStart({
    slug: 'e2e-synthetic-company-c', subscription_status: 'not_configured',
    stripe_customer_id: 'cus_test', stripe_subscription_id: 'sub_test',
  }), /already paid or bound/i);
  assert.throws(() => assertBillingCompanyCCanStart({
    slug: 'real-company', subscription_status: 'not_configured',
    stripe_customer_id: null, stripe_subscription_id: null,
  }), /synthetic company C/i);
});

test('company C writes are refused outside the exact repository branch', () => {
  assert.doesNotThrow(() => assertBillingCompanyCWriteBranch('svobonek-lab/dashboard', 'refs/heads/codex/billing-blocked-to-granted'));
  assert.throws(() => assertBillingCompanyCWriteBranch('other/repository', 'refs/heads/codex/billing-blocked-to-granted'), /approved staging billing branch/i);
  assert.throws(() => assertBillingCompanyCWriteBranch('svobonek-lab/dashboard', 'refs/heads/main'), /approved staging billing branch/i);
});
