import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { getPilotStripePriceSetup } from '../scripts/configure-staging-pilot-stripe-price.mjs';

const contract = readFileSync(new URL('../supabase/staging/20261015_stripe_billing_contract.sql', import.meta.url), 'utf8');
const completion = readFileSync(new URL('../supabase/staging/20261016_stripe_billing_completion.sql', import.meta.url), 'utf8');
const rebind = readFileSync(new URL('../supabase/migrations/20261031185027_allow_canceled_stripe_subscription_rebind.sql', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8');
const stagingWorkflow = readFileSync(new URL('../.github/workflows/staging-e2e.yml', import.meta.url), 'utf8');
const recoveryScript = readFileSync(new URL('../scripts/recover-staging-stripe-company-b.mjs', import.meta.url), 'utf8');
const pilotPriceSetupScript = readFileSync(new URL('../scripts/configure-staging-pilot-stripe-price.mjs', import.meta.url), 'utf8');

test('Stripe billing contract is service-only, idempotent and rejects cross-tenant customer binding', () => {
  assert.match(contract, /add column if not exists stripe_customer_id text/i);
  assert.match(contract, /add column if not exists current_period_end timestamptz/i);
  assert.match(contract, /subscription_status[^;]+check/i);
  assert.match(contract, /app_stripe_webhook_events/i);
  assert.match(contract, /on conflict \(event_id\) do nothing/i);
  assert.match(contract, /stripe customer is already bound to another tenant/i);
  assert.match(contract, /revoke all on function public\.app_apply_stripe_subscription_event/i);
  assert.match(contract, /grant execute on function public\.app_apply_stripe_subscription_event[^;]+to service_role/i);
  assert.doesNotMatch(contract, /grant execute[^;]+to (anon|authenticated)/i);
});

test('CI executes the disposable Stripe billing database contract', () => {
  assert.match(workflow, /stripe-billing-contract:/);
  assert.match(workflow, /supabase\/tests\/stripe_billing_setup\.sql/);
  assert.match(workflow, /supabase\/staging\/20261015_stripe_billing_contract\.sql/);
  assert.match(workflow, /supabase\/staging\/20261016_stripe_billing_completion\.sql/);
  assert.match(workflow, /supabase\/migrations\/20261031185027_allow_canceled_stripe_subscription_rebind\.sql/);
  assert.match(workflow, /supabase\/tests\/stripe_billing_verify\.sql/);
  assert.match(workflow, /supabase\/tests\/stripe_billing_concurrency\.sh/);
});

test('staging workflow exposes a dedicated company B recovery checkout on the isolated runner', () => {
  assert.match(stagingWorkflow, /- billing-recover-b/);
  assert.match(stagingWorkflow, /inputs\.runner_mode == 'billing-recover-b'/);
  assert.match(stagingWorkflow, /recover-staging-stripe-company-b\.mjs/);
  assert.match(stagingWorkflow, /STAGING_OWNER_B_PASSWORD/);
  assert.match(recoveryScript, /\/api\/stripe-checkout/);
  assert.match(recoveryScript, /safeCheckoutCode/);
  assert.match(recoveryScript, /e2e-synthetic-company-b/);
  assert.match(recoveryScript, /checkout\.session\.completed/);
  assert.match(recoveryScript, /STRIPE_TEST_HUMAN_CONFIRMATION_REQUIRED/);
  assert.match(recoveryScript, /waitingForManualStripeConfirmation \? 20 \* 60_000/);
  assert.doesNotMatch(recoveryScript, /\.from\(['"]app_companies['"]\)[\s\S]{0,500}\.update\(/);
});

test('local recovery permits only the fixed loopback checkout origin and keeps verification on staging', () => {
  assert.match(recoveryScript, /const LOCAL_CHECKOUT_ORIGIN = 'http:\/\/127\.0\.0\.1:4173'/);
  assert.match(recoveryScript, /STAGING_RECOVERY_CHECKOUT_ORIGIN !== LOCAL_CHECKOUT_ORIGIN/);
  assert.match(recoveryScript, /env\.STAGING_RECOVERY_CHECKOUT_ORIGIN \|\| PREVIEW_ORIGIN/);
  assert.match(recoveryScript, /page\.goto\(`\$\{PREVIEW_ORIGIN\}\/login`/);
  assert.match(stagingWorkflow, /- billing-recover-b-local/);
  assert.match(stagingWorkflow, /inputs\.runner_mode == 'billing-recover-b-local'/);
  assert.match(stagingWorkflow, /\.\/node_modules\/\.bin\/vite --host 127\.0\.0\.1 --port 4173 --strictPort/);
  assert.doesNotMatch(stagingWorkflow, /vercel@65\.8\.0 dev/);
  assert.doesNotMatch(stagingWorkflow, /\.vercel\/\.env\.(?:preview|development)\.local/);
  assert.match(stagingWorkflow, /STAGING_SUPABASE_PROJECT_REF.{0,20}xwzweltjvreqhjpbjrxa/);
});

test('staging workflow has a guarded branch-only pilot TEST price setup', () => {
  assert.match(stagingWorkflow, /- billing-configure-pilot-price/);
  assert.match(stagingWorkflow, /inputs\.runner_mode == 'billing-configure-pilot-price'/);
  assert.match(stagingWorkflow, /configure-staging-pilot-stripe-price\.mjs/);
  assert.match(pilotPriceSetupScript, /STRIPE_PRICE_STARTER_ID/);
  assert.match(pilotPriceSetupScript, /STRIPE_PRICE_PILOT_ID/);
  assert.match(pilotPriceSetupScript, /'env', 'add', 'STRIPE_PRICE_PILOT_ID', 'preview'/);
  assert.match(pilotPriceSetupScript, /'--type', 'config'/);
  assert.match(pilotPriceSetupScript, /'env', 'rm', 'STRIPE_PRICE_PILOT_ID', 'preview'/);
  assert.match(pilotPriceSetupScript, /codex\/staging-e2e-local-runner/);
});

test('Preview redeploy is manually gated to the staging branch and uses prebuilt Preview artifacts', () => {
  assert.match(stagingWorkflow, /- preview-redeploy/);
  assert.match(stagingWorkflow, /inputs\.runner_mode == 'preview-redeploy'/);
  assert.match(stagingWorkflow, /github\.ref == 'refs\/heads\/codex\/staging-e2e-local-runner'/);
  assert.match(stagingWorkflow, /vercel@65\.8\.0 deploy --prebuilt --environment=preview/);
  assert.match(stagingWorkflow, /alias set "\$deployment_url" dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects\.vercel\.app/);
  assert.match(stagingWorkflow, /preview-redeploy'\) \|\|/);
});

test('pilot price setup sets only the approved TEST Starter price on the exact branch', () => {
  const env = {
    GITHUB_REPOSITORY: 'svobonek-lab/dashboard',
    GITHUB_REF: 'refs/heads/codex/staging-e2e-local-runner',
    VERCEL_GIT_BRANCH: 'codex/staging-e2e-local-runner',
    STAGING_PREVIEW_URL: 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app',
    PRODUCTION_BASE_URL: 'https://dashboard-svobonek-6462s-projects.vercel.app',
    STAGING_STRIPE_SECRET_KEY: 'sk_test_synthetictestonly',
  };
  const starter = { STRIPE_BILLING_MODE: 'test', STRIPE_PRICE_STARTER_ID: 'price_123' };
  assert.deepEqual(getPilotStripePriceSetup(env, starter), {
    starterPriceId: 'price_123', pilotPriceId: '', shouldAdd: true, shouldReplaceExisting: false,
  });
  assert.deepEqual(getPilotStripePriceSetup(env, { ...starter, STRIPE_PRICE_PILOT_ID: '***********' }), {
    starterPriceId: 'price_123', pilotPriceId: '***********', shouldAdd: true, shouldReplaceExisting: true,
  });
  assert.deepEqual(getPilotStripePriceSetup(env, { ...starter, STRIPE_PRICE_PILOT_ID: '•••••••••••' }), {
    starterPriceId: 'price_123', pilotPriceId: '•••••••••••', shouldAdd: true, shouldReplaceExisting: true,
  });
  assert.deepEqual(getPilotStripePriceSetup(env, { ...starter, STRIPE_PRICE_PILOT_ID: 'xxxxxxxxxxx' }), {
    starterPriceId: 'price_123', pilotPriceId: 'xxxxxxxxxxx', shouldAdd: true, shouldReplaceExisting: true,
  });
  assert.deepEqual(getPilotStripePriceSetup(env, { ...starter, STRIPE_PRICE_PILOT_ID: '???????????' }), {
    starterPriceId: 'price_123', pilotPriceId: '???????????', shouldAdd: true, shouldReplaceExisting: true,
  });
  assert.deepEqual(getPilotStripePriceSetup(env, { ...starter, STRIPE_PRICE_PILOT_ID: 'price_123' }), {
    starterPriceId: 'price_123', pilotPriceId: 'price_123', shouldAdd: false, shouldReplaceExisting: false,
  });
  assert.throws(() => getPilotStripePriceSetup({ ...env, GITHUB_REF: 'refs/heads/main' }, starter), /approved staging repository branch/);
  assert.deepEqual(getPilotStripePriceSetup(env, { ...starter, STRIPE_PRICE_PILOT_ID: 'price_other' }), {
    starterPriceId: 'price_123', pilotPriceId: 'price_other', shouldAdd: true, shouldReplaceExisting: true,
  });
  assert.throws(() => getPilotStripePriceSetup({ ...env, STAGING_STRIPE_SECRET_KEY: 'sk_live_forbidden' }, starter), /Stripe TEST mode/);
});

test('Stripe re-subscription replaces only canceled same-customer plans and ignores late old events', () => {
  assert.match(rebind, /v_company\.subscription_status = 'canceled'[\s\S]*?p_event_type = 'checkout\.session\.completed'[\s\S]*?p_subscription_status = 'active'[\s\S]*?v_company\.stripe_customer_id = p_stripe_customer_id/);
  assert.match(rebind, /p_event_created_at < v_company\.stripe_event_created_at[\s\S]*?v_result <> 'stale'/);
  assert.match(rebind, /revoke all on function public\.app_apply_stripe_subscription_event/i);
  assert.match(rebind, /to service_role/i);
  assert.doesNotMatch(rebind, /to (anon|authenticated)/i);
});

test('billing completion functions are service-only and plan changes cannot activate access', () => {
  assert.match(completion, /app_bind_stripe_customer/);
  assert.match(completion, /app_platform_set_billing_plan/);
  assert.match(completion, /v_plan not in \('pilot', 'starter', 'growth'\)/);
  assert.match(completion, /revoke all on function public\.app_bind_stripe_customer\(uuid, text\) from public, anon, authenticated/i);
  assert.match(completion, /revoke all on function public\.app_platform_set_billing_plan\(uuid, uuid, text\) from public, anon, authenticated/i);
  assert.doesNotMatch(completion, /set subscription_status/);
});
