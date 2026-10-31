import Stripe from 'stripe';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

const STAGING_REF = 'xwzweltjvreqhjpbjrxa';
const PREVIEW_ORIGIN = 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app';
const COMPANY_SLUG = 'e2e-synthetic-company-b';
const OWNER_EMAIL = 'owner-b@stavbaflow.example.test';
const PURPOSE = 'staging-past-due-acceptance';
const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`Missing required configuration: ${name}`);
  return value;
}

function assertTarget(env) {
  if (env.GITHUB_REPOSITORY && env.GITHUB_REPOSITORY !== 'svobonek-lab/dashboard') {
    throw new Error('Refusing past-due acceptance outside the approved repository.');
  }
  if (env.GITHUB_REF && env.GITHUB_REF !== 'refs/heads/codex/staging-e2e-local-runner') {
    throw new Error('Refusing past-due acceptance outside the approved branch.');
  }
  let supabaseUrl;
  try { supabaseUrl = new URL(required(env, 'STAGING_SUPABASE_URL')); } catch {
    throw new Error('Refusing past-due acceptance: staging Supabase URL is invalid.');
  }
  if (env.STAGING_SUPABASE_PROJECT_REF !== STAGING_REF || env.STAGING_SUPABASE_PROJECT_REF === env.PRODUCTION_SUPABASE_PROJECT_REF ||
      supabaseUrl.protocol !== 'https:' || supabaseUrl.hostname !== `${STAGING_REF}.supabase.co` ||
      supabaseUrl.pathname !== '/' || supabaseUrl.search || supabaseUrl.hash || env.STAGING_PREVIEW_URL !== PREVIEW_ORIGIN ||
      env.STAGING_OWNER_B_EMAIL?.toLowerCase() !== OWNER_EMAIL || env.STRIPE_BILLING_MODE !== 'test' ||
      !/^sk_test_[A-Za-z0-9]+$/.test(String(env.STRIPE_SECRET_KEY || '')) ||
      !/^price_[A-Za-z0-9]+$/.test(String(env.STRIPE_PRICE_STARTER_ID || ''))) {
    throw new Error('Refusing past-due acceptance: exact StavbaCore staging, synthetic company B, Preview, and Stripe TEST are required.');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(env.STAGING_COMPANY_B_ID || ''))) {
    throw new Error('Refusing past-due acceptance: company B ID is invalid.');
  }
  return { projectRef: STAGING_REF, previewOrigin: PREVIEW_ORIGIN };
}

async function waitForClock(stripe, clockId) {
  const deadline = Date.now() + 180_000;
  while (Date.now() < deadline) {
    const clock = await stripe.testHelpers.testClocks.retrieve(clockId);
    if (clock.status === 'ready') return clock;
    if (clock.status === 'internal_failure' || clock.status === 'canceled') throw new Error(`Stripe TEST clock ended in ${clock.status}.`);
    await delay(1500);
  }
  throw new Error('Stripe TEST clock did not become ready in time.');
}

async function main(env = process.env) {
  const target = assertTarget(env);
  const companyId = required(env, 'STAGING_COMPANY_B_ID');
  const service = createClient(env.STAGING_SUPABASE_URL, required(env, 'STAGING_SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const auth = createClient(env.STAGING_SUPABASE_URL, required(env, 'STAGING_SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  let browser;
  let company;
  let subscription;
  try {
    const { data, error } = await service.from('app_companies')
      .select('id,slug,active,plan,subscription_status,stripe_customer_id,stripe_subscription_id')
      .eq('id', companyId).maybeSingle();
    if (error || !data || data.id !== companyId || data.slug !== COMPANY_SLUG) {
      throw new Error('Configured tenant is not the expected synthetic company B.');
    }
    company = data;
    if (company.active !== true || company.plan !== 'pilot' || company.subscription_status !== 'active') {
      throw new Error('Company B must remain on its existing active pilot plan before the screen-only failed-renewal test.');
    }
    if (company.stripe_customer_id || company.stripe_subscription_id) {
      throw new Error('Company B already has Stripe billing state; refusing to replace or reuse another billing scenario.');
    }

    const { data: owner, error: authError } = await auth.auth.signInWithPassword({
      email: OWNER_EMAIL,
      password: required(env, 'STAGING_OWNER_B_PASSWORD'),
    });
    if (authError || owner.user?.email?.toLowerCase() !== OWNER_EMAIL || !owner.user?.id || !owner.session?.access_token) {
      throw new Error('Synthetic owner B sign-in failed.');
    }
    const { data: memberships, error: membershipError } = await service.from('app_members')
      .select('company_id,role,active').eq('user_id', owner.user.id).eq('active', true);
    if (membershipError || memberships?.length !== 1 || memberships[0].company_id !== companyId || memberships[0].role !== 'owner') {
      throw new Error('Synthetic owner B is not the sole active owner of company B.');
    }

    const price = await stripe.prices.retrieve(required(env, 'STRIPE_PRICE_STARTER_ID'));
    if (price.livemode || !price.active || price.type !== 'recurring' || price.recurring?.interval !== 'month') {
      throw new Error('Starter price is not an active monthly Stripe TEST price.');
    }
    const clockName = 'StavbaFlow synthetic company B past-due acceptance';
    const clocks = await stripe.testHelpers.testClocks.list({ limit: 100 });
    if (clocks.data.some((clock) => clock.name === clockName) || clocks.has_more) {
      throw new Error('A prior company B past-due clock exists or clock inventory is incomplete; refusing to guess which test state to reuse.');
    }
    const clock = await stripe.testHelpers.testClocks.create({
      frozen_time: Math.floor(Date.now() / 60_000) * 60,
      name: clockName,
    }, { idempotencyKey: `stavbaflow-past-due-clock:${companyId}` });
    if (clock.livemode || clock.status !== 'ready') throw new Error('Company B Test Clock was not created ready in Stripe TEST.');
    const customer = await stripe.customers.create({
      email: OWNER_EMAIL,
      name: 'StavbaFlow synthetic billing acceptance B',
      test_clock: clock.id,
      metadata: { tenant_id: companyId, purpose: PURPOSE },
    }, { idempotencyKey: `stavbaflow-past-due-customer:${companyId}` });
    const goodPaymentMethod = await stripe.paymentMethods.attach('pm_card_visa', { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: goodPaymentMethod.id } });
    subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items: [{ price: price.id, quantity: 1 }],
      default_payment_method: goodPaymentMethod.id,
      collection_method: 'charge_automatically',
      payment_behavior: 'error_if_incomplete',
      metadata: { tenant_id: companyId, purpose: PURPOSE },
    }, { idempotencyKey: `stavbaflow-past-due-subscription:${companyId}` });
    if (subscription.livemode || subscription.status !== 'active' || subscription.test_clock !== clock.id) {
      throw new Error('Company B initial Starter TEST subscription did not activate under its isolated Test Clock.');
    }
    const { error: bindError } = await service.rpc('app_bind_stripe_customer', {
      p_company_id: companyId,
      p_stripe_customer_id: customer.id,
    });
    if (bindError) throw new Error('Could not bind the isolated Stripe TEST customer to synthetic company B.');
    // The application intentionally consumes subscription.updated, not subscription.created.
    subscription = await stripe.subscriptions.update(subscription.id, {
      metadata: { tenant_id: companyId, purpose: PURPOSE, acceptance_state: 'initial-active' },
    });

    const activeDeadline = Date.now() + 120_000;
    let stagingCompany;
    while (Date.now() < activeDeadline) {
      const result = await service.from('app_companies')
        .select('id,slug,active,plan,subscription_status,stripe_customer_id,stripe_subscription_id')
        .eq('id', companyId).maybeSingle();
      if (!result.error && result.data?.subscription_status === 'active' && result.data.stripe_subscription_id === subscription.id) {
        stagingCompany = result.data;
        break;
      }
      await delay(2000);
    }
    if (!stagingCompany) throw new Error('Staging webhook did not apply the active TEST subscription to company B.');

    const failurePaymentMethod = await stripe.paymentMethods.attach('pm_card_chargeCustomerFail', { customer: customer.id });
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: failurePaymentMethod.id } });
    subscription = await stripe.subscriptions.update(subscription.id, {
      default_payment_method: failurePaymentMethod.id,
      metadata: { tenant_id: companyId, purpose: PURPOSE, acceptance_state: 'renewal-failure' },
    });
    const periodEnd = Math.max(...subscription.items.data.map((item) => item.current_period_end));
    const currentClock = await stripe.testHelpers.testClocks.retrieve(clock.id);
    if (!Number.isSafeInteger(periodEnd) || periodEnd <= currentClock.frozen_time ||
        periodEnd > currentClock.frozen_time + 62 * 24 * 60 * 60) {
      throw new Error('Company B billing period is outside the safe one-month Test Clock window.');
    }
    await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: periodEnd + 60 });
    const readyClock = await waitForClock(stripe, clock.id);

    const pastDueDeadline = Date.now() + 180_000;
    let failedRenewal;
    while (Date.now() < pastDueDeadline) {
      [subscription, stagingCompany] = await Promise.all([
        stripe.subscriptions.retrieve(subscription.id),
        service.from('app_companies').select('id,slug,active,plan,subscription_status,stripe_customer_id,stripe_subscription_id')
          .eq('id', companyId).maybeSingle().then((result) => {
            if (result.error) throw new Error('Could not read company B billing state after renewal.');
            return result.data;
          }),
      ]);
      if (subscription.status === 'past_due' && stagingCompany?.subscription_status === 'past_due') {
        failedRenewal = subscription.latest_invoice;
        break;
      }
      await delay(2500);
    }
    if (!failedRenewal || stagingCompany?.stripe_subscription_id !== subscription.id) {
      throw new Error(`Renewal failure did not reach the staging app: Stripe=${subscription.status}, app=${stagingCompany?.subscription_status ?? 'unknown'}.`);
    }

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${target.previewOrigin}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByPlaceholder('jmeno@firma.cz').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(required(env, 'STAGING_OWNER_B_PASSWORD'));
    await page.getByRole('button', { name: 'Pokračovat do workspace' }).click();
    await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 30_000 });
    await page.getByRole('heading', { name: 'Předplatné vypršelo' }).waitFor({ state: 'visible', timeout: 30_000 });
    await page.getByRole('button', { name: 'Přejít k platbě' }).waitFor({ state: 'visible' });
    const invoice = typeof failedRenewal === 'string' ? failedRenewal : failedRenewal?.id;
    if (!invoice) throw new Error('Failed renewal did not provide an invoice to restore the synthetic company afterward.');

    // Restore the synthetic tenant after capturing the blocked owner screen so later staging E2E runs stay usable.
    await stripe.customers.update(customer.id, { invoice_settings: { default_payment_method: goodPaymentMethod.id } });
    await stripe.subscriptions.update(subscription.id, {
      default_payment_method: goodPaymentMethod.id,
      metadata: { tenant_id: companyId, purpose: PURPOSE, acceptance_state: 'restore-active' },
    });
    await stripe.invoices.pay(invoice, { payment_method: goodPaymentMethod.id });
    const restoredDeadline = Date.now() + 120_000;
    while (Date.now() < restoredDeadline) {
      const [restoredSubscription, restoredCompanyResult] = await Promise.all([
        stripe.subscriptions.retrieve(subscription.id),
        service.from('app_companies').select('subscription_status,stripe_subscription_id')
          .eq('id', companyId).maybeSingle(),
      ]);
      if (restoredSubscription.status === 'active' && restoredCompanyResult.data?.subscription_status === 'active' &&
          restoredCompanyResult.data.stripe_subscription_id === subscription.id) break;
      await delay(2000);
    }
    const [restoredSubscription, restoredCompanyResult] = await Promise.all([
      stripe.subscriptions.retrieve(subscription.id),
      service.from('app_companies').select('subscription_status,stripe_subscription_id')
        .eq('id', companyId).maybeSingle(),
    ]);
    if (restoredSubscription.status !== 'active' || restoredCompanyResult.error ||
        restoredCompanyResult.data?.subscription_status !== 'active' ||
        restoredCompanyResult.data.stripe_subscription_id !== subscription.id) {
      throw new Error('Company B owner screen passed, but the staging subscription did not restore to active afterward.');
    }
    return {
      target: 'StavbaCore Staging / Stripe TEST',
      companySlug: COMPANY_SLUG,
      appPlan: company.plan,
      stripePriceRole: 'monthly Starter TEST price used only to produce a renewal event; company B plan is not changed',
      stripeSubscriptionStatus: subscription.status,
      appSubscriptionStatus: stagingCompany.subscription_status,
      ownerScreen: 'Předplatné vypršelo; Přejít k platbě visible',
      testClockReachedRenewal: readyClock.frozen_time >= periodEnd,
      companyRestoredAfterScreenCheck: true,
      verifiedAt: new Date().toISOString(),
      invoiceExists: Boolean(invoice),
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await auth.auth.signOut().catch(() => {});
  }
}

main().then((result) => console.log(JSON.stringify(result))).catch((error) => {
  console.error(JSON.stringify({ code: 'STAGING_STRIPE_PAST_DUE_TEST_FAILED', message: error instanceof Error ? error.message : 'Staging Stripe past-due test failed.' }));
  process.exitCode = 1;
});
