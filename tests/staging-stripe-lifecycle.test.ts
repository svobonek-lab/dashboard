import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { getPortalCancellationSettings, isPortalContentReady, isPortalDocumentReady, redactPortalText, summarizePortalFrames, validateStagingStripeLifecycle, validateStagingStripePortalUrl } from '../scripts/staging-stripe-lifecycle-guard.mjs';

const validEnv = {
  STAGING_SUPABASE_URL: 'https://xwzweltjvreqhjpbjrxa.supabase.co',
  STAGING_SUPABASE_PROJECT_REF: 'xwzweltjvreqhjpbjrxa',
  PRODUCTION_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv',
  STAGING_PREVIEW_URL: 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app',
  PRODUCTION_BASE_URL: 'https://stavbaflow.cz',
  STAGING_COMPANY_A_ID: '3a51a21e-5b13-48d1-87e9-a5915b46d37d',
  STAGING_OWNER_A_EMAIL: 'owner-a@stavbaflow.example.test',
  STAGING_OWNER_A_PASSWORD: 'synthetic-only-password',
  STAGING_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_value',
  STRIPE_SECRET_KEY: 'sk_test_synthetic',
  STRIPE_BILLING_MODE: 'test',
};

test('Stripe lifecycle accepts only the exact staging project and Preview in TEST mode', () => {
  assert.deepEqual(validateStagingStripeLifecycle(validEnv), {
    projectRef: 'xwzweltjvreqhjpbjrxa',
    previewOrigin: 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app',
  });
});

test('Stripe lifecycle refuses production database ref even when URL looks like staging', () => {
  assert.throws(() => validateStagingStripeLifecycle({
    ...validEnv,
    STAGING_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv',
    STAGING_SUPABASE_URL: 'https://oncmtmrhmjlerbwkrecv.supabase.co',
  }), /approved isolated staging project/);
});

test('Stripe lifecycle refuses live Stripe credentials and non-synthetic owner identities', () => {
  assert.throws(() => validateStagingStripeLifecycle({ ...validEnv, STRIPE_BILLING_MODE: 'live' }), /TEST mode/);
  assert.throws(() => validateStagingStripeLifecycle({ ...validEnv, STAGING_OWNER_A_EMAIL: 'owner@example.com' }), /synthetic/);
});

test('Stripe lifecycle accepts only the hosted Stripe billing portal URL', () => {
  assert.equal(validateStagingStripePortalUrl('https://billing.stripe.com/p/session_test'), 'https://billing.stripe.com/p/session_test');
  assert.throws(() => validateStagingStripePortalUrl('https://billing.stripe.com.attacker.example/p/session_test'), /hosted billing portal/);
  assert.throws(() => validateStagingStripePortalUrl('http://billing.stripe.com/p/session_test'), /hosted billing portal/);
});

test('portal document readiness uses loaded visible content, not body locator geometry', () => {
  assert.equal(isPortalDocumentReady({
    readyState: 'complete',
    bodyTextLength: 563,
    bodyDisplay: 'block',
    bodyVisibility: 'visible',
    bodyOpacity: '1',
  }), true);
  assert.equal(isPortalDocumentReady({
    readyState: 'complete',
    bodyTextLength: 0,
    bodyDisplay: 'block',
    bodyVisibility: 'visible',
    bodyOpacity: '1',
  }), false);
  assert.equal(isPortalDocumentReady({
    readyState: 'complete',
    bodyTextLength: 563,
    bodyDisplay: 'none',
    bodyVisibility: 'visible',
    bodyOpacity: '1',
  }), false);
});

test('portal content readiness waits past the generic Stripe landing shell', () => {
  assert.equal(isPortalContentReady({ readyState: 'complete', bodyTextLength: 153, bodyDisplay: 'block', bodyVisibility: 'visible', bodyOpacity: '1', hasSubscriptionWords: false, cancellationActionVisible: false }), false);
  assert.equal(isPortalContentReady({ readyState: 'complete', bodyTextLength: 563, bodyDisplay: 'block', bodyVisibility: 'visible', bodyOpacity: '1', hasSubscriptionWords: false, cancellationActionVisible: false }), true);
  assert.equal(isPortalContentReady({ readyState: 'complete', bodyTextLength: 153, bodyDisplay: 'block', bodyVisibility: 'visible', bodyOpacity: '1', hasSubscriptionWords: true, cancellationActionVisible: false }), true);
});

test('portal cancellation settings report only the enabled flag and configured timing', () => {
  assert.deepEqual(getPortalCancellationSettings({
    features: { subscription_cancel: { enabled: true, mode: 'at_period_end' } },
  }), { enabled: true, mode: 'at_period_end' });
  assert.deepEqual(getPortalCancellationSettings({
    features: { subscription_cancel: { enabled: false, mode: 'immediately' } },
  }), { enabled: false, mode: 'immediately' });
  assert.deepEqual(getPortalCancellationSettings(null), { enabled: false, mode: null });
});

test('portal action discovery includes interactive controls inside Stripe frames', () => {
  assert.deepEqual(summarizePortalFrames([
    { host: 'billing.stripe.com', title: 'VelocityStack sandbox Billing', bodyText: 'Nothing visible for owner-a@stavbaflow.example.test.', bodyTextLength: 80, hasSubscriptionWords: true, saysNoSubscription: false, billingContentVisible: true, visibleControlCount: 0, visibleActions: [] },
    { host: 'billing.stripe.com', title: '', bodyTextLength: 24, hasSubscriptionWords: false, saysNoSubscription: false, billingContentVisible: false, visibleControlCount: 1, visibleActions: ['Cancel subscription'] },
  ]), {
    title: 'VelocityStack sandbox Billing',
    bodyTextPreview: 'Nothing visible for [email].',
    billingContentVisible: true,
    cancellationActionVisible: true,
    visibleActions: ['Cancel subscription'],
    frameCount: 2,
    frameDiagnostics: [
      { host: 'billing.stripe.com', bodyTextLength: 80, hasSubscriptionWords: true, saysNoSubscription: false, visibleControlCount: 0 },
      { host: 'billing.stripe.com', bodyTextLength: 24, hasSubscriptionWords: false, saysNoSubscription: false, visibleControlCount: 1 },
    ],
  });
});

test('portal text diagnostics redact identity and Stripe identifiers', () => {
  assert.equal(
    redactPortalText('No subscription for owner-a@stavbaflow.example.test (cus_test123), phone +420 777 123 456.'),
    'No subscription for [email] ([stripe-id]), phone [phone].',
  );
});

test('billing portal inspection runs only on the one-shot staging runner and exact branch', () => {
  const workflow = readFileSync(new URL('../.github/workflows/staging-e2e.yml', import.meta.url), 'utf8');
  assert.match(workflow, /- billing-portal-inspect/);
  assert.match(workflow, /inputs\.runner_mode != 'billing-portal-inspect'/);
  const job = workflow.match(/staging-stripe-billing-portal-inspection:([\s\S]*?)(?=\n  [a-z][a-z0-9-]+:|\s*$)/)?.[1] || '';
  assert.match(job, /inputs\.runner_mode == 'billing-portal-inspect'/);
  assert.match(job, /refs\/heads\/codex\/staging-e2e-local-runner/);
  assert.match(job, /self-hosted, linux, x64, staging-e2e/);
  assert.match(job, /node scripts\/inspect-staging-stripe-billing-portal\.mjs/);
  assert.doesNotMatch(job, /SUPABASE_SERVICE_ROLE_KEY/);
});
