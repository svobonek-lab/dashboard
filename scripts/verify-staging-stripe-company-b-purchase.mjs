import Stripe from 'stripe';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import { assertCompanyBCheckoutAcceptance } from './staging-billing-verification.mjs';

const PROJECT_REF = 'xwzweltjvreqhjpbjrxa';
const PREVIEW_ORIGIN = 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app';
const COMPANY_SLUG = 'e2e-synthetic-company-b';
const OWNER_EMAIL = 'owner-b@stavbaflow.example.test';

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`Missing required configuration: ${name}`);
  return value;
}

function idOf(value) {
  return typeof value === 'string' ? value : value?.id;
}

function assertTarget(env) {
  if (env.GITHUB_REPOSITORY !== 'svobonek-lab/dashboard' ||
      env.GITHUB_REF !== 'refs/heads/codex/staging-e2e-local-runner') {
    throw new Error('Refusing billing verification outside the approved repository branch.');
  }
  const stagingUrl = new URL(required(env, 'STAGING_SUPABASE_URL'));
  if (env.STAGING_SUPABASE_PROJECT_REF !== PROJECT_REF ||
      env.STAGING_SUPABASE_PROJECT_REF === env.PRODUCTION_SUPABASE_PROJECT_REF ||
      stagingUrl.protocol !== 'https:' || stagingUrl.hostname !== `${PROJECT_REF}.supabase.co` ||
      env.STAGING_PREVIEW_URL !== PREVIEW_ORIGIN ||
      new URL(env.PRODUCTION_BASE_URL).origin === PREVIEW_ORIGIN ||
      env.STAGING_OWNER_B_EMAIL?.toLowerCase() !== OWNER_EMAIL ||
      env.STRIPE_BILLING_MODE !== 'test' ||
      !/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(required(env, 'STRIPE_SECRET_KEY'))) {
    throw new Error('Refusing billing verification outside the exact isolated StavbaCore Staging and Stripe TEST targets.');
  }
}

async function main(env = process.env) {
  assertTarget(env);
  const companyId = required(env, 'STAGING_COMPANY_B_ID');
  const service = createClient(env.STAGING_SUPABASE_URL, required(env, 'STAGING_SUPABASE_SERVICE_ROLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const auth = createClient(env.STAGING_SUPABASE_URL, required(env, 'STAGING_SUPABASE_PUBLISHABLE_KEY'), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);
  let browser;
  try {
    const { data: company, error: companyError } = await service.from('app_companies')
      .select('id,slug,active,plan,subscription_status,stripe_customer_id,stripe_subscription_id')
      .eq('id', companyId).maybeSingle();
    if (companyError || !company || company.slug !== COMPANY_SLUG) {
      throw new Error('Configured tenant is not synthetic company B.');
    }
    if (!company.stripe_customer_id || !company.stripe_subscription_id) {
      throw new Error('Synthetic company B has no complete Stripe TEST binding.');
    }

    const [{ data: signedIn, error: authError }, customer, subscription, sessions] = await Promise.all([
      auth.auth.signInWithPassword({
        email: OWNER_EMAIL,
        password: required(env, 'STAGING_OWNER_B_PASSWORD'),
      }),
      stripe.customers.retrieve(company.stripe_customer_id),
      stripe.subscriptions.retrieve(company.stripe_subscription_id),
      stripe.checkout.sessions.list({ customer: company.stripe_customer_id, status: 'complete', limit: 100 }),
    ]);
    if (authError || signedIn.user?.email?.toLowerCase() !== OWNER_EMAIL || !signedIn.user.id || !signedIn.session?.access_token) {
      throw new Error('Synthetic company B owner sign-in failed.');
    }
    const { data: memberships, error: membershipError } = await service.from('app_members')
      .select('company_id,role,active')
      .eq('user_id', signedIn.user.id)
      .eq('active', true);
    if (membershipError || memberships?.length !== 1 || memberships[0].company_id !== companyId || memberships[0].role !== 'owner') {
      throw new Error('Synthetic owner B is not the sole active owner of company B.');
    }

    const checkout = sessions.data.find((session) =>
      idOf(session.subscription) === company.stripe_subscription_id &&
      session.metadata?.tenant_id === companyId);
    if (!checkout) throw new Error('No completed Stripe TEST Checkout matches company B\'s active subscription.');
    assertCompanyBCheckoutAcceptance({
      companyId,
      company,
      customer,
      subscription,
      checkout,
    });

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(`${PREVIEW_ORIGIN}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.getByPlaceholder('jmeno@firma.cz').fill(OWNER_EMAIL);
    await page.locator('input[type="password"]').fill(required(env, 'STAGING_OWNER_B_PASSWORD'));
    await page.getByRole('button', { name: 'Pokračovat do workspace' }).click();
    await page.waitForURL((url) => url.pathname === '/dashboard', { timeout: 30_000 });
    await page.getByRole('heading', { name: 'Předplatné vypršelo' }).waitFor({ state: 'hidden', timeout: 20_000 });
    if (await page.getByRole('button', { name: 'Přejít k platbě' }).count()) {
      throw new Error('Company B owner still sees the expired-subscription gate after the applied Checkout webhook.');
    }

    return {
      target: 'StavbaCore Staging / Stripe TEST',
      companySlug: COMPANY_SLUG,
      appPlan: company.plan,
      companySubscriptionStatus: company.subscription_status,
      stripeSubscriptionStatus: subscription.status,
      checkoutStatus: checkout.status,
      checkoutMatchesActiveSubscription: true,
      ownerDashboard: 'accessible',
      verifiedAt: new Date().toISOString(),
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await auth.auth.signOut().catch(() => {});
  }
}

main().then((result) => console.log(JSON.stringify(result))).catch((error) => {
  console.error(JSON.stringify({
    code: 'STAGING_STRIPE_COMPANY_B_PURCHASE_VERIFY_FAILED',
    message: error instanceof Error ? error.message : 'Synthetic company B purchase verification failed.',
  }));
  process.exitCode = 1;
});
