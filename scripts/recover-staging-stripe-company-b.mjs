import Stripe from 'stripe';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'node:crypto';

const PROJECT_REF = 'xwzweltjvreqhjpbjrxa';
const PREVIEW_ORIGIN = 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app';
const LOCAL_CHECKOUT_ORIGIN = 'http://127.0.0.1:4173';
const COMPANY_SLUG = 'e2e-synthetic-company-b';
const OWNER_EMAIL = 'owner-b@stavbaflow.example.test';
const PURPOSE = 'staging-past-due-acceptance';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`Missing required configuration: ${name}`);
  return value;
}

function safeCheckoutCode(payload) {
  const code = payload && typeof payload.code === 'string' ? payload.code : '';
  return /^[A-Z][A-Z0-9_]{0,79}$/.test(code) ? code : 'UNKNOWN';
}

function assertTarget(env) {
  if (env.GITHUB_REPOSITORY !== 'svobonek-lab/dashboard' ||
      env.GITHUB_REF !== 'refs/heads/codex/staging-e2e-local-runner') {
    throw new Error('Refusing synthetic company B recovery outside the approved repository branch.');
  }
  if (env.STAGING_SUPABASE_PROJECT_REF !== PROJECT_REF ||
      env.STAGING_SUPABASE_PROJECT_REF === env.PRODUCTION_SUPABASE_PROJECT_REF ||
      new URL(required(env, 'STAGING_SUPABASE_URL')).hostname !== `${PROJECT_REF}.supabase.co`) {
    throw new Error('Refusing recovery outside the exact isolated StavbaCore Staging project.');
  }
  if (new URL(required(env, 'STAGING_PREVIEW_URL')).origin !== PREVIEW_ORIGIN ||
      new URL(env.STAGING_PREVIEW_URL).origin === new URL(required(env, 'PRODUCTION_BASE_URL')).origin) {
    throw new Error('Refusing recovery outside the approved staging Preview.');
  }
  if (env.STAGING_RECOVERY_CHECKOUT_ORIGIN && env.STAGING_RECOVERY_CHECKOUT_ORIGIN !== LOCAL_CHECKOUT_ORIGIN) {
    throw new Error('Refusing recovery outside the exact loopback-only local checkout server.');
  }
  if (env.STAGING_OWNER_B_EMAIL?.toLowerCase() !== OWNER_EMAIL) {
    throw new Error('Refusing recovery for a non-synthetic owner account.');
  }
  if (env.STRIPE_BILLING_MODE !== 'test' || !/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(required(env, 'STRIPE_SECRET_KEY'))) {
    throw new Error('Refusing recovery unless Stripe is in TEST mode.');
  }
}

async function fillCardField(page, selectors, value) {
  const deadline = Date.now() + 20_000;
  while (Date.now() < deadline) {
    const frames = page.frames();
    for (const selector of selectors) {
      for (const frame of frames) {
        const input = frame.locator(selector).first();
        if (await input.count() && await input.isVisible().catch(() => false)) {
          await input.fill(value);
          return;
        }
      }
    }
    await wait(250);
  }
  throw new Error('Stripe TEST Checkout did not expose the expected secure card field.');
}

async function main(env = process.env) {
  assertTarget(env);
  const companyId = required(env, 'STAGING_COMPANY_B_ID');
  const companyIdPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!companyIdPattern.test(companyId)) throw new Error('Synthetic company B ID is invalid.');

  const service = createClient(env.STAGING_SUPABASE_URL, required(env, 'STAGING_SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const auth = createClient(env.STAGING_SUPABASE_URL, required(env, 'STAGING_SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  let browser;
  try {
    const [{ data: company, error: companyError }, { data: signedIn, error: authError }] = await Promise.all([
      service.from('app_companies')
        .select('id,slug,active,plan,subscription_status,stripe_customer_id,stripe_subscription_id')
        .eq('id', companyId).maybeSingle(),
      auth.auth.signInWithPassword({
        email: required(env, 'STAGING_OWNER_B_EMAIL'),
        password: required(env, 'STAGING_OWNER_B_PASSWORD'),
      }),
    ]);
    if (companyError || !company || company.id !== companyId || company.slug !== COMPANY_SLUG ||
        company.active !== true || company.plan !== 'pilot' || company.subscription_status !== 'canceled' ||
        !company.stripe_customer_id || !company.stripe_subscription_id) {
      throw new Error('Company B is not the expected active synthetic tenant with a canceled, complete billing binding.');
    }
    if (authError || signedIn.user?.email?.toLowerCase() !== OWNER_EMAIL || !signedIn.user.id || !signedIn.session?.access_token) {
      throw new Error('Synthetic company B owner sign-in failed.');
    }
    const { data: memberships, error: membershipError } = await service.from('app_members')
      .select('company_id,role,active').eq('user_id', signedIn.user.id).eq('active', true);
    if (membershipError || memberships?.length !== 1 || memberships[0].company_id !== companyId || memberships[0].role !== 'owner') {
      throw new Error('The synthetic owner is not the sole active owner of company B.');
    }

    const [customer, oldSubscription] = await Promise.all([
      stripe.customers.retrieve(company.stripe_customer_id),
      stripe.subscriptions.retrieve(company.stripe_subscription_id),
    ]);
    if (customer.deleted || customer.livemode || customer.metadata?.tenant_id !== companyId ||
        customer.metadata?.purpose !== PURPOSE || !customer.test_clock || oldSubscription.livemode ||
        oldSubscription.status !== 'canceled' || oldSubscription.metadata?.tenant_id !== companyId ||
        oldSubscription.metadata?.purpose !== PURPOSE ||
        (typeof oldSubscription.customer === 'string' ? oldSubscription.customer : oldSubscription.customer.id) !== customer.id ||
        oldSubscription.test_clock !== customer.test_clock) {
      throw new Error('The existing company B Stripe TEST customer, clock, and canceled subscription do not match the synthetic fixture.');
    }
    const clock = await stripe.testHelpers.testClocks.retrieve(customer.test_clock);
    if (clock.livemode || clock.status !== 'ready') throw new Error('Company B Stripe TEST clock is not ready.');
    const methods = await stripe.paymentMethods.list({ customer: customer.id, type: 'card', limit: 100 });
    const successfulTestMethod = methods.data.find((method) => method.card?.last4 === '4242');
    if (!successfulTestMethod) throw new Error('The synthetic company B customer has no existing successful Stripe TEST card for the recovery/cleanup path.');
    await stripe.customers.update(customer.id, {
      invoice_settings: { default_payment_method: successfulTestMethod.id },
    });

    const operationId = randomUUID();
    const checkoutOrigin = env.STAGING_RECOVERY_CHECKOUT_ORIGIN || PREVIEW_ORIGIN;
    const checkoutResponse = await fetch(`${checkoutOrigin}/api/stripe-checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${signedIn.session.access_token}`,
        'X-StavbaFlow-Idempotency-Key': operationId,
        'Cache-Control': 'no-store',
      },
    });
    const payload = await checkoutResponse.json().catch(() => null);
    if (!checkoutResponse.ok || typeof payload?.url !== 'string') {
      throw new Error(`The staging owner Checkout endpoint refused recovery (HTTP ${checkoutResponse.status}, ${safeCheckoutCode(payload)}).`);
    }
    const checkoutUrl = new URL(payload.url);
    const sessionId = /(?:^|\/)(cs_test_[A-Za-z0-9_]+)(?:\/|$|\?)/.exec(checkoutUrl.pathname)?.[1];
    if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.stripe.com' || !sessionId) {
      throw new Error('The staging endpoint did not return an isolated hosted Stripe TEST Checkout session.');
    }
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 2 });
    const priceId = typeof lineItems.data[0]?.price === 'string' ? lineItems.data[0].price : lineItems.data[0]?.price?.id;
    const price = priceId ? await stripe.prices.retrieve(priceId) : null;
    if (session.livemode || session.status !== 'open' || session.mode !== 'subscription' ||
        session.customer !== customer.id || session.metadata?.tenant_id !== companyId || session.metadata?.plan !== company.plan ||
        lineItems.data.length !== 1 || lineItems.data[0].quantity !== 1 || !price || price.livemode ||
        !price.active || price.type !== 'recurring' || price.recurring?.interval !== 'month' || !session.url) {
      throw new Error('Checkout session is not a monthly TEST subscription bound to synthetic company B.');
    }

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(session.url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    let manualCardEntry = true;
    try {
      await fillCardField(page, ['input[name="cardnumber"]', 'input[autocomplete="cc-number"]'], '4242424242424242');
    } catch {
      manualCardEntry = false;
    }
    if (manualCardEntry) {
      await fillCardField(page, ['input[name="exp-date"]', 'input[autocomplete="cc-exp"]'], '1234');
      await fillCardField(page, ['input[name="cvc"]', 'input[autocomplete="cc-csc"]'], '123');
    } else if (!await page.getByText('4242').count()) {
      throw new Error('Stripe TEST Checkout showed neither a card entry field nor the preselected synthetic test card.');
    }
    const submit = page.locator('button[type="submit"]:visible').last();
    if (!await submit.count()) throw new Error('Stripe TEST Checkout submit button was not available.');
    await submit.click();

    const deadline = Date.now() + 120_000;
    let completedSession;
    let recoveredCompany;
    let recoveredSubscription;
    while (Date.now() < deadline) {
      [completedSession, recoveredCompany] = await Promise.all([
        stripe.checkout.sessions.retrieve(session.id, { expand: ['subscription'] }),
        service.from('app_companies').select('subscription_status,stripe_subscription_id')
          .eq('id', companyId).maybeSingle().then((result) => {
            if (result.error) throw new Error('Could not read synthetic company B state after Checkout.');
            return result.data;
          }),
      ]);
      const subscriptionId = typeof completedSession.subscription === 'string'
        ? completedSession.subscription
        : completedSession.subscription?.id;
      if (completedSession.status === 'complete' && subscriptionId && recoveredCompany?.subscription_status === 'active' &&
          recoveredCompany.stripe_subscription_id === subscriptionId) {
        recoveredSubscription = typeof completedSession.subscription === 'string'
          ? await stripe.subscriptions.retrieve(subscriptionId)
          : completedSession.subscription;
        if (recoveredSubscription.status === 'active') break;
      }
      await wait(2000);
    }
    if (!recoveredSubscription || recoveredCompany?.subscription_status !== 'active') {
      throw new Error(`Signed Checkout webhook did not restore company B in time (checkout=${completedSession?.status || 'unknown'}, app=${recoveredCompany?.subscription_status || 'unknown'}).`);
    }
    const { data: webhookRows, error: webhookError } = await service.from('app_stripe_webhook_events')
      .select('event_id,event_type,result,event_created_at')
      .eq('company_id', companyId).eq('event_type', 'checkout.session.completed')
      .order('event_created_at', { ascending: false }).limit(5);
    const checkoutCreatedAt = session.created * 1000;
    if (webhookError || !webhookRows?.some((row) => row.result === 'applied' &&
        new Date(row.event_created_at).getTime() >= checkoutCreatedAt - 5000)) {
      throw new Error('Company B became active, but no applied signed Checkout webhook event is recorded.');
    }

    await page.goto(`${PREVIEW_ORIGIN}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByPlaceholder('jmeno@firma.cz').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(required(env, 'STAGING_OWNER_B_PASSWORD'));
    await page.getByRole('button', { name: 'Pokračovat do workspace' }).click();
    await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 30_000 });
    await page.getByRole('heading', { name: 'Předplatné vypršelo' }).waitFor({ state: 'hidden', timeout: 20_000 });
    if (await page.getByRole('button', { name: 'Přejít k platbě' }).count()) {
      throw new Error('Company B owner still sees the expired-subscription gate after Checkout.');
    }

    return {
      target: 'StavbaCore Staging / Stripe TEST',
      companySlug: COMPANY_SLUG,
      appPlan: company.plan,
      checkoutStatus: completedSession.status,
      previousStripeSubscriptionStatus: oldSubscription.status,
      newStripeSubscriptionStatus: recoveredSubscription.status,
      companySubscriptionStatus: recoveredCompany.subscription_status,
      ownerDashboard: 'accessible after signed checkout webhook',
      signedCheckoutWebhook: 'applied',
      verifiedAt: new Date().toISOString(),
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await auth.auth.signOut().catch(() => {});
  }
}

main().then((result) => console.log(JSON.stringify(result))).catch((error) => {
  console.error(JSON.stringify({
    code: 'STAGING_STRIPE_COMPANY_B_RECOVERY_FAILED',
    message: error instanceof Error ? error.message : 'Synthetic company B recovery failed.',
  }));
  process.exitCode = 1;
});
