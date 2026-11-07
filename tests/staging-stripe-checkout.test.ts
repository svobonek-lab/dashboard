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
import { buildStagingPreviewRuntimeArgs } from '../scripts/deploy-staging-preview-runtime.mjs';
import { buildStagingStripeEnvLines, isApprovedStagingStripeExportBranch, parseVercelStripePreviewConfig } from '../scripts/export-staging-stripe-env.mjs';

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
  PUBLIC_APP_URL: 'https://app.staging.example.test',
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

test('billing workflow is exact-branch self-hosted and pulls only non-secret config without deployment', () => {
  const workflow = readFileSync(new URL('../.github/workflows/staging-e2e.yml', import.meta.url), 'utf8');
  assert.match(workflow, /- billing-setup/);
  assert.match(workflow, /inputs\.runner_mode == 'billing-setup'/);
  assert.match(workflow, /github\.ref == 'refs\/heads\/codex\/staging-e2e-local-runner'/);
  assert.match(workflow, /runs-on: \[self-hosted, linux, x64, staging-e2e\]/);
  assert.match(workflow, /env pull.*--environment=preview.*--git-branch=codex\/staging-e2e-local-runner/);
  assert.match(workflow, /STAGING_STRIPE_SECRET_KEY/);
  assert.match(workflow, /inputs\.runner_mode != 'billing-setup'/);
  const exportStep = workflow.match(/- name: Pull non-secret Stripe TEST config from the approved Vercel Preview([\s\S]*?)- name: Prepare one Stripe TEST Checkout/)?.[1] || '';
  assert.notEqual(exportStep, '');
  assert.doesNotMatch(exportStep, /STAGING_OWNER_A_PASSWORD|STAGING_SUPABASE_SERVICE_ROLE_KEY|STAGING_SUPABASE_PUBLISHABLE_KEY/);
});

test('company C acceptance is branch-gated, split for CAPTCHA handoff, and retains only a one-day checkout artifact', () => {
  const workflow = readFileSync(new URL('../.github/workflows/staging-e2e.yml', import.meta.url), 'utf8');
  assert.match(workflow, /- billing-blocked-to-granted/);
  assert.match(workflow, /inputs\.runner_mode != 'billing-blocked-to-granted'/);
  assert.match(workflow, /staging-stripe-billing-company-c-prepare:[\s\S]*?github\.ref == 'refs\/heads\/codex\/billing-blocked-to-granted'[\s\S]*?runs-on: \[self-hosted, Windows, X64, staging-billing\]/);
  assert.match(workflow, /staging-stripe-billing-company-c-verify:[\s\S]*?needs: staging-stripe-billing-company-c-prepare/);
  assert.match(workflow, /name: staging-billing-company-c-checkout[\s\S]*?retention-days: 1/);
  assert.match(workflow, /env pull.*--environment=preview.*--git-branch=codex\/staging-e2e-local-runner/);
  assert.match(workflow, /staging-billing-company-c-credentials\.mjs prepare/);
  assert.match(workflow, /staging-billing-company-c-credentials\.mjs load/);
  assert.match(workflow, /path: \$\{\{ runner\.temp \}\}\/staging-billing-company-c/);
  assert.doesNotMatch(workflow, /STAGING_OWNER_C_PASSWORD:\s*\$\{\{\s*secrets\./);
  assert.doesNotMatch(workflow, /STAGING_OWNER_C_PASSWORD:\s*\$\{\{\s*vars\./);
  const deploy = workflow.match(/- name: Create a run-scoped Stripe TEST webhook and refresh isolated staging Preview([\s\S]*?)- name: Prepare private synthetic owner C credentials/)?.[1] || '';
  assert.match(deploy, /deploy-staging-preview-runtime\.mjs/);
  assert.match(deploy, /STAGING_SUPABASE_SERVICE_ROLE_KEY:\s*\$\{\{\s*secrets\.STAGING_SUPABASE_SERVICE_ROLE_KEY\s*\}\}/);
  assert.match(deploy, /STAGING_STRIPE_SECRET_KEY:\s*\$\{\{\s*secrets\.STAGING_STRIPE_SECRET_KEY\s*\}\}/);
  assert.doesNotMatch(deploy, /vercel env run/);
  assert.match(deploy, /STAGING_WEBHOOK_ENDPOINT_FILE:/);
  assert.match(deploy, /node scripts\/deploy-staging-preview-runtime\.mjs/);
  assert.doesNotMatch(deploy, /STAGING_VERCEL_PREVIEW_ENV_FILE/);
  assert.doesNotMatch(deploy, /vercel@65\.8\.0 deploy --prebuilt/);
});

test('Vercel config parser reads only allowlisted settings without executing env contents', () => {
  const parsed = parseVercelStripePreviewConfig([
    'STRIPE_BILLING_MODE="test"',
    'STRIPE_PRICE_STARTER_ID=price_preview',
    'STRIPE_PRICE_PILOT_ID=price_pilot_preview',
    'PUBLIC_APP_URL="https://app.staging.example.test"',
    'STRIPE_SECRET_KEY=should-not-be-read',
    'OTHER_CONFIG=$(touch /tmp/not-executed)',
  ].join('\n'));
  assert.deepEqual(parsed, {
    STRIPE_BILLING_MODE: 'test',
    STRIPE_PRICE_STARTER_ID: 'price_preview',
    STRIPE_PRICE_PILOT_ID: 'price_pilot_preview',
    PUBLIC_APP_URL: 'https://app.staging.example.test',
  });
});

test('Stripe config export permits only the original staging runner and this billing test branch', () => {
  assert.equal(isApprovedStagingStripeExportBranch('svobonek-lab/dashboard', 'refs/heads/codex/staging-e2e-local-runner'), true);
  assert.equal(isApprovedStagingStripeExportBranch('svobonek-lab/dashboard', 'refs/heads/codex/billing-blocked-to-granted'), true);
  assert.equal(isApprovedStagingStripeExportBranch('other/repository', 'refs/heads/codex/billing-blocked-to-granted'), false);
  assert.equal(isApprovedStagingStripeExportBranch('svobonek-lab/dashboard', 'refs/heads/main'), false);
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
    STRIPE_PRICE_PILOT_ID: 'price_pilotunitonly',
    PUBLIC_APP_URL: 'https://app.staging.example.test',
    STAGING_PREVIEW_URL: baseEnv.STAGING_PREVIEW_URL,
    PRODUCTION_BASE_URL: baseEnv.PRODUCTION_BASE_URL,
  };
  const lines = buildStagingStripeEnvLines(env);
  assert.match(lines, /STRIPE_BILLING_MODE=test/);
  assert.match(lines, /STRIPE_PRICE_STARTER_ID=price_unitonly/);
  assert.match(lines, /STRIPE_PRICE_PILOT_ID=price_pilotunitonly/);
  assert.match(buildStagingStripeEnvLines({ ...env, STRIPE_PRICE_PILOT_ID: ' price_pilotunitonly ' }), /STRIPE_PRICE_PILOT_ID=price_pilotunitonly/);
  assert.doesNotMatch(lines, /SUPABASE_SERVICE_ROLE_KEY|OWNER_A_PASSWORD/);
  assert.throws(() => buildStagingStripeEnvLines({ ...env, STRIPE_SECRET_KEY: 'sk_live_never' }), /TEST mode/i);
  assert.throws(() => buildStagingStripeEnvLines({ ...env, PUBLIC_APP_URL: baseEnv.STAGING_PREVIEW_URL }), /staging Preview/i);
  assert.throws(() => buildStagingStripeEnvLines({ ...env, PUBLIC_APP_URL: baseEnv.PRODUCTION_BASE_URL }), /staging Preview/i);
  assert.throws(() => buildStagingStripeEnvLines({ ...env, STRIPE_PRICE_STARTER_ID: 'price_unitonly\nSECRET=value' }), /Starter Stripe TEST price ID/i);
  assert.throws(() => buildStagingStripeEnvLines({ ...env, STRIPE_PRICE_PILOT_ID: 'price_pilot\nSECRET=value' }), /Pilot Stripe TEST price ID/i);
});

test('staging runtime deployment pins server APIs to StavbaCore and Stripe TEST', () => {
  const args = buildStagingPreviewRuntimeArgs({
    GITHUB_REPOSITORY: 'svobonek-lab/dashboard',
    GITHUB_REF: 'refs/heads/codex/billing-blocked-to-granted',
    STAGING_SUPABASE_URL: baseEnv.STAGING_SUPABASE_URL,
    STAGING_PREVIEW_URL: baseEnv.STAGING_PREVIEW_URL,
    PRODUCTION_BASE_URL: baseEnv.PRODUCTION_BASE_URL,
    STAGING_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    STAGING_SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_staging',
    STAGING_STRIPE_SECRET_KEY: 'sk_test_unitonly',
    STRIPE_BILLING_MODE: 'test',
    STRIPE_PRICE_STARTER_ID: 'price_startest',
    STAGING_STRIPE_WEBHOOK_SECRET: 'whsec_stagingtest',
    BILLING_RETURN_URL: baseEnv.STAGING_PREVIEW_URL,
  });
  const runtimePairs = args.filter((_, index) => index % 2 === 1);
  assert.deepEqual(runtimePairs.map((arg) => arg.split('=')[0]), [
    'SUPABASE_URL', 'SUPABASE_ANON_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY',
    'STRIPE_BILLING_MODE', 'STRIPE_PRICE_STARTER_ID', 'STRIPE_WEBHOOK_SECRET', 'BILLING_RETURN_URL',
  ]);
  assert.equal(runtimePairs.includes(`SUPABASE_URL=${baseEnv.STAGING_SUPABASE_URL}`), true);
  assert.equal(runtimePairs.includes('STRIPE_BILLING_MODE=test'), true);
  assert.equal(runtimePairs.includes(`BILLING_RETURN_URL=${baseEnv.STAGING_PREVIEW_URL}`), true);
  assert.equal(runtimePairs.some((arg) => arg === 'STRIPE_SECRET_KEY=sk_test_unitonly'), true);
  assert.equal(runtimePairs.some((arg) => arg === 'SUPABASE_SERVICE_ROLE_KEY=sb_secret_staging'), true);
});

test('staging runtime deployment refuses production endpoints and live Stripe keys', () => {
  const env = {
    GITHUB_REPOSITORY: 'svobonek-lab/dashboard',
    GITHUB_REF: 'refs/heads/codex/billing-blocked-to-granted',
    STAGING_SUPABASE_URL: baseEnv.STAGING_SUPABASE_URL,
    STAGING_PREVIEW_URL: baseEnv.STAGING_PREVIEW_URL,
    PRODUCTION_BASE_URL: baseEnv.PRODUCTION_BASE_URL,
    STAGING_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test',
    STAGING_SUPABASE_SERVICE_ROLE_KEY: 'sb_secret_staging',
    STAGING_STRIPE_SECRET_KEY: 'sk_test_unitonly',
    STRIPE_BILLING_MODE: 'test',
    STRIPE_PRICE_STARTER_ID: 'price_starter_test',
    STAGING_STRIPE_WEBHOOK_SECRET: 'whsec_stagingtest',
    BILLING_RETURN_URL: baseEnv.STAGING_PREVIEW_URL,
  };
  assert.throws(() => buildStagingPreviewRuntimeArgs({ ...env, STAGING_SUPABASE_URL: 'https://oncmtmrhmjlerbwkrecv.supabase.co' }), /StavbaCore Staging/);
  assert.throws(() => buildStagingPreviewRuntimeArgs({ ...env, STAGING_STRIPE_SECRET_KEY: 'sk_live_never' }), /TEST mode/);
  assert.throws(() => buildStagingPreviewRuntimeArgs({ ...env, BILLING_RETURN_URL: baseEnv.PRODUCTION_BASE_URL }), /staging Preview/);
});
