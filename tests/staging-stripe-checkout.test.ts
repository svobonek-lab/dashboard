import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  assertSyntheticCompanyA,
  formatSafeBillingSetupLog,
  validateStagingBillingSetup,
} from '../scripts/staging-stripe-checkout-guard.mjs';
import { createScopedBillingSetupEnv } from '../scripts/run-staging-stripe-checkout.mjs';
import { billingAcceptanceOperationId } from '../scripts/prepare-staging-stripe-checkout.mjs';
import { buildStagingStripeEnvLines } from '../scripts/export-staging-stripe-env.mjs';

const baseEnv = {
  STAGING_SUPABASE_URL: 'https://xwzweltjvreqhjpbjrxa.supabase.co',
  STAGING_SUPABASE_PROJECT_REF: 'xwzweltjvreqhjpbjrxa',
  PRODUCTION_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv',
  STAGING_PREVIEW_URL: 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app',
  PRODUCTION_BASE_URL: 'https://stavbaflow.cz',
  STAGING_COMPANY_A_ID: '10000000-0000-4000-8000-000000000001',
  STAGING_OWNER_A_EMAIL: 'owner-a@stavbaflow.example.test',
  STAGING_OWNER_A_PASSWORD: 'synthetic-password-only',
  STAGING_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_only',
  STAGING_SUPABASE_SERVICE_ROLE_KEY: 'service-role-test-only',
  STRIPE_SECRET_KEY: 'sk_test_unitonly',
  STRIPE_BILLING_MODE: 'test',
  STRIPE_PRICE_STARTER_ID: 'price_unitonly',
  BILLING_RETURN_URL: 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app',
  STAGING_BILLING_ARTIFACT_DIR: 'C:/runner-temp/staging-billing',
};

test('billing setup accepts only the exact isolated staging target and Stripe TEST mode', () => {
  assert.doesNotThrow(() => validateStagingBillingSetup(baseEnv));
});

test('billing setup rejects production Supabase and live Stripe before any mutation', () => {
  assert.throws(() => validateStagingBillingSetup({ ...baseEnv, STAGING_SUPABASE_PROJECT_REF: baseEnv.PRODUCTION_SUPABASE_PROJECT_REF }), /production/i);
  assert.throws(() => validateStagingBillingSetup({ ...baseEnv, STAGING_SUPABASE_URL: 'https://oncmtmrhmjlerbwkrecv.supabase.co' }), /staging/i);
  assert.throws(() => validateStagingBillingSetup({ ...baseEnv, STRIPE_BILLING_MODE: 'live' }), /TEST/i);
  assert.throws(() => validateStagingBillingSetup({ ...baseEnv, STRIPE_SECRET_KEY: 'sk_live_never' }), /TEST/i);
});

test('billing setup rejects missing environment before any mutation', () => {
  const incomplete = { ...baseEnv } as Record<string, string | undefined>;
  delete incomplete.STAGING_OWNER_A_PASSWORD;
  assert.throws(() => validateStagingBillingSetup(incomplete), /STAGING_OWNER_A_PASSWORD/);
});

test('billing setup rejects a non-synthetic owner email before Stripe API access', () => {
  assert.throws(() => validateStagingBillingSetup({
    ...baseEnv,
    STAGING_OWNER_A_EMAIL: 'real-person@example.com',
  }), /synthetic company A fixture account/i);
});

test('billing setup verifies the exact synthetic company A identity', () => {
  assert.doesNotThrow(() => assertSyntheticCompanyA({
    id: baseEnv.STAGING_COMPANY_A_ID,
    slug: 'e2e-synthetic-company-a',
  }, baseEnv.STAGING_COMPANY_A_ID));
  assert.throws(() => assertSyntheticCompanyA({
    id: '20000000-0000-4000-8000-000000000002',
    slug: 'e2e-synthetic-company-a',
  }, baseEnv.STAGING_COMPANY_A_ID), /company A ID/i);
  assert.throws(() => assertSyntheticCompanyA({
    id: baseEnv.STAGING_COMPANY_A_ID,
    slug: 'real-customer',
  }, baseEnv.STAGING_COMPANY_A_ID), /synthetic/i);
});

test('ordinary setup logs omit Checkout URLs and access tokens', () => {
  const log = formatSafeBillingSetupLog({
    projectRef: baseEnv.STAGING_SUPABASE_PROJECT_REF,
    companySlug: 'e2e-synthetic-company-a',
    customerId: 'cus_test_only',
    testClockId: 'clock_test_only',
    checkoutUrl: 'https://checkout.stripe.com/c/pay_cs_test_secret',
    accessToken: 'eyJhbGciOiJIUzI1NiJ9.secret.signature',
  });
  assert.match(log, /xwzweltjvreqhjpbjrxa/);
  assert.match(log, /cus_test_only/);
  assert.doesNotMatch(log, /checkout\.stripe\.com|cs_test_secret|eyJhbGci/);
});

test('runner forwards only the staging billing allowlist and drops other Vercel secrets', () => {
  const scoped = createScopedBillingSetupEnv({
    ...baseEnv,
    SUPABASE_SERVICE_ROLE_KEY: 'unrelated-preview-value',
    STRIPE_WEBHOOK_SECRET: 'webhook-value-not-needed-by-setup',
    VITE_SUPABASE_URL: 'https://production.example.invalid',
    VERCEL_TOKEN: 'vercel-token-not-needed-by-setup',
  });
  assert.equal(scoped.STRIPE_SECRET_KEY, baseEnv.STRIPE_SECRET_KEY);
  assert.equal(scoped.STAGING_SUPABASE_SERVICE_ROLE_KEY, baseEnv.STAGING_SUPABASE_SERVICE_ROLE_KEY);
  assert.equal('SUPABASE_SERVICE_ROLE_KEY' in scoped, false);
  assert.equal('STRIPE_WEBHOOK_SECRET' in scoped, false);
  assert.equal('VITE_SUPABASE_URL' in scoped, false);
  assert.equal('VERCEL_TOKEN' in scoped, false);
});

test('billing workflow is exact-branch self-hosted and pulls only that Preview branch', () => {
  const workflow = readFileSync(new URL('../.github/workflows/staging-e2e.yml', import.meta.url), 'utf8');
  assert.match(workflow, /- billing-setup/);
  assert.match(workflow, /inputs\.runner_mode == 'billing-setup'/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/codex\/staging-e2e-local-runner'/);
  assert.match(workflow, /runs-on: \[self-hosted, linux, x64, staging-e2e\]/);
  assert.match(workflow, /env run --environment=preview --git-branch=codex\/staging-e2e-local-runner/);
  assert.match(workflow, /inputs\.runner_mode != 'billing-setup'/);
  const exportStep = workflow.match(/- name: Export only Stripe TEST values from the approved Vercel Preview([\s\S]*?)- name: Prepare one Stripe TEST Checkout/)?.[1] || '';
  assert.notEqual(exportStep, '');
  assert.doesNotMatch(exportStep, /STAGING_OWNER_A_PASSWORD|STAGING_SUPABASE_SERVICE_ROLE_KEY|STAGING_SUPABASE_PUBLISHABLE_KEY/);
});

test('billing acceptance Checkout idempotency key is stable per company A', () => {
  const first = billingAcceptanceOperationId(baseEnv.STAGING_COMPANY_A_ID);
  assert.equal(billingAcceptanceOperationId(baseEnv.STAGING_COMPANY_A_ID), first);
  assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.notEqual(billingAcceptanceOperationId('20000000-0000-4000-8000-000000000002'), first);
});

test('Vercel Stripe export accepts only TEST prices and the exact staging Preview origin', () => {
  const env = {
    STRIPE_SECRET_KEY: 'sk_test_unitonly',
    STRIPE_BILLING_MODE: 'test',
    STRIPE_PRICE_STARTER_ID: 'price_unitonly',
    BILLING_RETURN_URL: baseEnv.STAGING_PREVIEW_URL,
    STAGING_PREVIEW_URL: baseEnv.STAGING_PREVIEW_URL,
    PRODUCTION_BASE_URL: baseEnv.PRODUCTION_BASE_URL,
  };
  const lines = buildStagingStripeEnvLines(env);
  assert.match(lines, /STRIPE_BILLING_MODE=test/);
  assert.match(lines, /STRIPE_PRICE_STARTER_ID=price_unitonly/);
  assert.doesNotMatch(lines, /SUPABASE_SERVICE_ROLE_KEY|OWNER_A_PASSWORD/);
  assert.throws(() => buildStagingStripeEnvLines({ ...env, STRIPE_SECRET_KEY: 'sk_live_never' }), /TEST mode/i);
  assert.throws(() => buildStagingStripeEnvLines({ ...env, BILLING_RETURN_URL: baseEnv.PRODUCTION_BASE_URL }), /staging Preview/i);
  assert.throws(() => buildStagingStripeEnvLines({ ...env, STRIPE_PRICE_STARTER_ID: 'price_unitonly\nSECRET=value' }), /Starter Stripe TEST price ID/i);
});
