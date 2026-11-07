import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, promises as fs } from 'node:fs';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getPilotStripePriceSetup } from '../scripts/configure-staging-pilot-stripe-price.mjs';
import { cleanNpmBuildEnvironment } from '../scripts/run-vercel-build.mjs';
import { extractVercelPreviewUrl } from '../scripts/extract-vercel-preview-url.mjs';
import { buildStagingWebhookEndpointParams, cleanupStagingWebhookEndpoint, createStagingWebhookEndpoint, validateStagingWebhookEndpoint } from '../scripts/staging-stripe-webhook.mjs';

const contract = readFileSync(new URL('../supabase/staging/20261015_stripe_billing_contract.sql', import.meta.url), 'utf8');
const completion = readFileSync(new URL('../supabase/staging/20261016_stripe_billing_completion.sql', import.meta.url), 'utf8');
const rebind = readFileSync(new URL('../supabase/migrations/20261031185027_allow_canceled_stripe_subscription_rebind.sql', import.meta.url), 'utf8');
const workflow = readFileSync(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8');
const stagingWorkflow = readFileSync(new URL('../.github/workflows/staging-e2e.yml', import.meta.url), 'utf8');
const billingAcceptanceSpec = readFileSync(new URL('../tests/e2e/billing-blocked-to-granted.spec.ts', import.meta.url), 'utf8');
const recoveryScript = readFileSync(new URL('../scripts/recover-staging-stripe-company-b.mjs', import.meta.url), 'utf8');
const purchaseVerificationScript = readFileSync(new URL('../scripts/verify-staging-stripe-company-b-purchase.mjs', import.meta.url), 'utf8');
const pilotPriceSetupScript = readFileSync(new URL('../scripts/configure-staging-pilot-stripe-price.mjs', import.meta.url), 'utf8');
const stagingWebhookScriptPath = new URL('../scripts/staging-stripe-webhook.mjs', import.meta.url);

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

test('company C billing acceptance refreshes only the fixed staging Preview before checkout', () => {
  const companyC = stagingWorkflow.slice(
    stagingWorkflow.indexOf('  staging-stripe-billing-company-c-prepare:'),
    stagingWorkflow.indexOf('  staging-stripe-billing-company-c-verify:'),
  );
  const deploy = companyC.indexOf('Create a run-scoped Stripe TEST webhook and refresh isolated staging Preview');
  const checkout = companyC.indexOf('Verify blocked owner and start one Stripe TEST Checkout');
  assert.ok(deploy >= 0 && deploy < checkout, 'Staging Preview must be refreshed before the Checkout attempt.');
  const deployBlock = companyC.slice(deploy, checkout);
  assert.match(deployBlock, /vercel@65\.8\.0 pull --yes --environment=preview --git-branch=codex\/staging-e2e-local-runner/);
  assert.match(deployBlock, /vercel@65\.8\.0 -- node scripts\/run-vercel-build\.mjs build/);
  assert.match(deployBlock, /--package=vercel@65\.8\.0 -- node scripts\/deploy-staging-preview-runtime\.mjs/);
  const runtimeDeployment = readFileSync(new URL('../scripts/deploy-staging-preview-runtime.mjs', import.meta.url), 'utf8');
  assert.match(runtimeDeployment, /'deploy', '--prebuilt', '--environment=preview'/);
  assert.match(runtimeDeployment, /\['--env', `\$\{key\}=\$\{value\}`\]/);
  assert.match(runtimeDeployment, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(runtimeDeployment, /STAGING_STRIPE_WEBHOOK_SECRET\s*:\s*webhook\.secret/);
  assert.match(runtimeDeployment, /createStagingWebhookEndpoint\(new Stripe\(required\(env, 'STAGING_STRIPE_SECRET_KEY'\)\), env\)/);
  assert.match(runtimeDeployment, /extractVercelPreviewUrl/);
  assert.match(deployBlock, /STAGING_SUPABASE_URL: \$\{\{ vars\.STAGING_SUPABASE_URL \}\}/);
  assert.match(deployBlock, /STAGING_SUPABASE_PUBLISHABLE_KEY: \$\{\{ secrets\.STAGING_SUPABASE_PUBLISHABLE_KEY \}\}/);
  assert.match(deployBlock, /STAGING_SUPABASE_SERVICE_ROLE_KEY: \$\{\{ secrets\.STAGING_SUPABASE_SERVICE_ROLE_KEY \}\}/);
  assert.match(deployBlock, /STAGING_STRIPE_SECRET_KEY: \$\{\{ secrets\.STAGING_STRIPE_SECRET_KEY \}\}/);
  assert.doesNotMatch(deployBlock, /vercel env run/);
  assert.match(deployBlock, /STAGING_WEBHOOK_ENDPOINT_FILE:/);
  assert.match(deployBlock, /node scripts\/deploy-staging-preview-runtime\.mjs/);
  assert.doesNotMatch(deployBlock, /STAGING_VERCEL_PREVIEW_ENV_FILE/);
  assert.match(deployBlock, /STAGING_WEBHOOK_ENDPOINT_FILE:/);
  assert.match(deployBlock, /VITE_SUPABASE_URL\s*=\s*\$env:STAGING_SUPABASE_URL/);
  assert.match(deployBlock, /VITE_SUPABASE_ANON_KEY\s*=\s*\$env:STAGING_SUPABASE_PUBLISHABLE_KEY/);
  assert.match(deployBlock, /dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects\.vercel\.app/);
  assert.doesNotMatch(deployBlock, /dashboard-svobonek-6462s-projects\.vercel\.app/);
});

test('staging billing provisions a run-scoped Stripe TEST webhook and cleans it up after verification', () => {
  assert.equal(existsSync(stagingWebhookScriptPath), true, 'The staging-only webhook lifecycle helper must exist.');
  const webhookScript = readFileSync(stagingWebhookScriptPath, 'utf8');
  assert.match(webhookScript, /api\/stripe-webhook\?staging_billing_run_id=/);
  assert.match(webhookScript, /const EVENTS = \[[\s\S]*?'checkout\.session\.completed',[\s\S]*?'customer\.subscription\.updated',[\s\S]*?'customer\.subscription\.deleted'/);
  assert.match(webhookScript, /staging billing webhook endpoint does not match this run/i);
  assert.match(stagingWorkflow, /Create a run-scoped Stripe TEST webhook and refresh isolated staging Preview/);
  assert.match(stagingWorkflow, /Remove the run-scoped Stripe TEST webhook/);
  assert.match(stagingWorkflow, /if: always\(\)[\s\S]*?staging-stripe-webhook\.mjs cleanup/);
});

test('staging Stripe webhook endpoint is run-scoped, HTTPS staging-only and TEST-only', () => {
  const env = {
    GITHUB_REPOSITORY: 'svobonek-lab/dashboard',
    GITHUB_REF: 'refs/heads/codex/billing-blocked-to-granted',
    GITHUB_RUN_ID: '42385009075',
    GITHUB_RUN_ATTEMPT: '1',
    STAGING_STRIPE_SECRET_KEY: 'sk_test_synthetic',
    STAGING_PREVIEW_URL: 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app',
    PRODUCTION_BASE_URL: 'https://dashboard-svobonek-6462s-projects.vercel.app',
  };
  const params = buildStagingWebhookEndpointParams(env);
  assert.equal(params.url, `${env.STAGING_PREVIEW_URL}/api/stripe-webhook?staging_billing_run_id=${env.GITHUB_RUN_ID}&staging_billing_attempt=${env.GITHUB_RUN_ATTEMPT}`);
  assert.deepEqual(params.enabled_events, ['checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted']);
  const validEndpoint = { id: 'we_synthetic', livemode: false, url: params.url, description: params.description, enabled_events: params.enabled_events, metadata: params.metadata };
  assert.equal(validateStagingWebhookEndpoint(validEndpoint, env), validEndpoint);
  assert.throws(() => buildStagingWebhookEndpointParams({ ...env, STAGING_STRIPE_SECRET_KEY: 'sk_live_forbidden' }), /Stripe TEST mode/);
  assert.throws(() => buildStagingWebhookEndpointParams({ ...env, STAGING_PREVIEW_URL: env.PRODUCTION_BASE_URL }), /exact isolated staging Preview/);
  assert.throws(() => validateStagingWebhookEndpoint({ ...validEndpoint, livemode: true }, env), /does not match this run/);
});

test('staging Stripe webhook setup saves only its endpoint ID and cleans only the same TEST run', async () => {
  const env = {
    GITHUB_REPOSITORY: 'svobonek-lab/dashboard',
    GITHUB_REF: 'refs/heads/codex/billing-blocked-to-granted',
    GITHUB_RUN_ID: '42385009075',
    GITHUB_RUN_ATTEMPT: '1',
    STAGING_STRIPE_SECRET_KEY: 'sk_test_synthetic',
    STAGING_PREVIEW_URL: 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app',
    PRODUCTION_BASE_URL: 'https://dashboard-svobonek-6462s-projects.vercel.app',
    STAGING_WEBHOOK_ENDPOINT_FILE: join(await fs.mkdtemp(join(tmpdir(), 'stavbaflow-webhook-test-')), 'endpoint.json'),
  };
  let createdParams;
  let createOptions;
  let deletedEndpointId = '';
  const endpoint = {
    id: 'we_synthetic',
    livemode: false,
    url: `${env.STAGING_PREVIEW_URL}/api/stripe-webhook?staging_billing_run_id=${env.GITHUB_RUN_ID}&staging_billing_attempt=${env.GITHUB_RUN_ATTEMPT}`,
    description: `StavbaFlow PR 156 Stripe TEST billing run ${env.GITHUB_RUN_ID} attempt ${env.GITHUB_RUN_ATTEMPT}`,
    enabled_events: ['checkout.session.completed', 'customer.subscription.updated', 'customer.subscription.deleted'],
    metadata: { purpose: 'stavbaflow-pr156-billing-acceptance', github_run_id: env.GITHUB_RUN_ID, github_run_attempt: env.GITHUB_RUN_ATTEMPT },
    secret: 'whsec_synthetic',
  };
  const stripe = {
    webhookEndpoints: {
      create: async (params, options) => { createdParams = params; createOptions = options; return endpoint; },
      retrieve: async () => ({ ...endpoint, secret: undefined }),
      del: async (id) => { deletedEndpointId = id; },
    },
  };
  try {
    const created = await createStagingWebhookEndpoint(stripe, env);
    assert.deepEqual(created, { endpointId: endpoint.id, secret: endpoint.secret });
    assert.equal(createOptions.idempotencyKey, `stavbaflow-pr156-${env.GITHUB_RUN_ID}-${env.GITHUB_RUN_ATTEMPT}`);
    assert.equal(createdParams.url, endpoint.url);
    const saved = JSON.parse(await fs.readFile(env.STAGING_WEBHOOK_ENDPOINT_FILE, 'utf8'));
    assert.deepEqual(saved, { endpointId: endpoint.id, runId: env.GITHUB_RUN_ID, attempt: env.GITHUB_RUN_ATTEMPT });
    assert.equal(await cleanupStagingWebhookEndpoint(stripe, env), true);
    assert.equal(deletedEndpointId, endpoint.id);
    deletedEndpointId = '';
    await fs.writeFile(env.STAGING_WEBHOOK_ENDPOINT_FILE, JSON.stringify({ endpointId: endpoint.id, runId: env.GITHUB_RUN_ID, attempt: '2' }));
    await assert.rejects(cleanupStagingWebhookEndpoint(stripe, env), /different staging billing webhook endpoint/);
    assert.equal(deletedEndpointId, '');
  } finally {
    await fs.rm(join(env.STAGING_WEBHOOK_ENDPOINT_FILE, '..'), { recursive: true, force: true });
  }
});

test('Vercel build wrapper strips only npm exec allow-scripts forwarding', () => {
  const source = {
    npm_config_allow_scripts: 'legacy-policy',
    NPM_CONFIG_ALLOW_SCRIPTS: 'legacy-policy',
    npm_config_registry: 'https://registry.example.test',
    PATH: 'runner-path',
    VERCEL_TOKEN: 'test-token',
  };
  const cleaned = cleanNpmBuildEnvironment(source);
  assert.deepEqual(cleaned, {
    npm_config_registry: 'https://registry.example.test',
    PATH: 'runner-path',
    VERCEL_TOKEN: 'test-token',
  });
  assert.equal(source.npm_config_allow_scripts, 'legacy-policy');
});

test('Vercel deployment output parser extracts only the labeled Preview URL', () => {
  const output = [
    'Inspect https://vercel.com/svobonek-6462s-projects/dashboard/abc123',
    'Preview https://dashboard-138gopqbz-svobonek-6462s-projects.vercel.app',
  ].join('\n');
  assert.equal(
    extractVercelPreviewUrl(output),
    'https://dashboard-138gopqbz-svobonek-6462s-projects.vercel.app',
  );
  assert.throws(() => extractVercelPreviewUrl('Inspect https://vercel.com/deployment/id'), /exactly one labeled Preview URL/);
  assert.throws(() => extractVercelPreviewUrl(`${output}\nPreview https://other.vercel.app`), /exactly one labeled Preview URL/);
});

test('company C prepare phase has a bounded timeout inside its Actions job budget', () => {
  assert.match(billingAcceptanceSpec, /test\.setTimeout\(phase === 'prepare' \? 6 \* 60_000 : 35 \* 60_000\)/);
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
  const localRecovery = stagingWorkflow.slice(
    stagingWorkflow.indexOf('  staging-stripe-billing-recover-company-b-local:'),
    stagingWorkflow.indexOf('  staging-stripe-billing-company-c-prepare:'),
  );
  assert.match(recoveryScript, /const LOCAL_CHECKOUT_ORIGIN = 'http:\/\/127\.0\.0\.1:4173'/);
  assert.match(recoveryScript, /STAGING_RECOVERY_CHECKOUT_ORIGIN !== LOCAL_CHECKOUT_ORIGIN/);
  assert.match(recoveryScript, /env\.STAGING_RECOVERY_CHECKOUT_ORIGIN \|\| PREVIEW_ORIGIN/);
  assert.match(recoveryScript, /page\.goto\(`\$\{PREVIEW_ORIGIN\}\/login`/);
  assert.match(stagingWorkflow, /- billing-recover-b-local/);
  assert.match(stagingWorkflow, /inputs\.runner_mode == 'billing-recover-b-local'/);
  assert.match(stagingWorkflow, /\.\/node_modules\/\.bin\/vite --host 127\.0\.0\.1 --port 4173 --strictPort/);
  assert.doesNotMatch(localRecovery, /vercel@65\.8\.0 dev/);
  assert.doesNotMatch(localRecovery, /\.vercel\/\.env\.(?:preview|development)\.local/);
  assert.match(stagingWorkflow, /STAGING_SUPABASE_PROJECT_REF.{0,20}xwzweltjvreqhjpbjrxa/);
});

test('completed company B purchase verification is a staging-only read-only workflow', () => {
  assert.match(stagingWorkflow, /- billing-verify-b-purchase/);
  assert.match(stagingWorkflow, /inputs\.runner_mode == 'billing-verify-b-purchase'/);
  assert.match(stagingWorkflow, /verify-staging-stripe-company-b-purchase\.mjs/);
  assert.match(purchaseVerificationScript, /assertCompanyBCheckoutAcceptance/);
  assert.match(purchaseVerificationScript, /page\.goto\(`\$\{PREVIEW_ORIGIN\}\/login`/);
  assert.doesNotMatch(purchaseVerificationScript, /app_stripe_webhook_events/);
  assert.doesNotMatch(purchaseVerificationScript, /\.rpc\(|\.insert\(|\.update\(|\.delete\(/);
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
