import Stripe from 'stripe';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';
import {
  getPortalCancellationSettings,
  isPortalContentReady,
  validateStagingStripeLifecycle,
  validateStagingStripePortalUrl,
} from './staging-stripe-lifecycle-guard.mjs';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function required(env, key) {
  const value = String(env[key] || '').trim();
  if (!value) throw new Error(`Missing required configuration: ${key}`);
  return value;
}

async function companyBillingState(client, companyId) {
  const { data, error } = await client.from('app_companies')
    .select('id,slug,active,plan,subscription_status,stripe_customer_id,stripe_subscription_id')
    .eq('id', companyId).maybeSingle();
  if (error || !data || data.id !== companyId || data.slug !== 'e2e-synthetic-company-a') {
    throw new Error('Owner A cannot read the expected synthetic company billing row.');
  }
  return data;
}

async function waitForClockReady(stripe, clockId, timeoutMs = 150000) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < timeoutMs) {
    const clock = await stripe.testHelpers.testClocks.retrieve(clockId);
    if (clock.status === 'ready') return clock;
    if (clock.status === 'internal_failure' || clock.status === 'canceled') {
      throw new Error(`Stripe TEST Clock ended in ${clock.status}.`);
    }
    await wait(1500);
  }
  throw new Error('Stripe TEST Clock did not finish advancing within the timeout.');
}

async function cancelAndAdvance(env = process.env) {
  const target = validateStagingStripeLifecycle(env);
  const companyId = required(env, 'STAGING_COMPANY_A_ID');
  const client = createClient(env.STAGING_SUPABASE_URL, env.STAGING_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let browser;
  try {
    const { data: auth, error: authError } = await client.auth.signInWithPassword({
      email: required(env, 'STAGING_OWNER_A_EMAIL'),
      password: required(env, 'STAGING_OWNER_A_PASSWORD'),
    });
    if (authError || !auth.user || !auth.session?.access_token ||
        auth.user.email?.toLowerCase() !== 'owner-a@stavbaflow.example.test') {
      throw new Error('Synthetic owner A authentication failed.');
    }
    const { data: memberships, error: membershipError } = await client.from('app_members')
      .select('company_id,role,active').eq('user_id', auth.user.id).eq('active', true);
    if (membershipError || memberships?.length !== 1 || memberships[0].company_id !== companyId ||
        memberships[0].role !== 'owner') {
      throw new Error('Owner A is not the sole active owner of synthetic company A.');
    }

    const company = await companyBillingState(client, companyId);
    if (company.active !== true || company.plan !== 'starter' || company.subscription_status !== 'active' ||
        typeof company.stripe_customer_id !== 'string' || typeof company.stripe_subscription_id !== 'string') {
      throw new Error('Company A is not in the expected active Starter billing state.');
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const [customer, subscription] = await Promise.all([
      stripe.customers.retrieve(company.stripe_customer_id),
      stripe.subscriptions.retrieve(company.stripe_subscription_id),
    ]);
    if (customer.deleted || customer.livemode || customer.metadata?.tenant_id !== companyId ||
        customer.metadata?.purpose !== 'staging-billing-acceptance' || !customer.test_clock ||
        subscription.livemode || subscription.status !== 'active' || subscription.cancel_at_period_end ||
        (typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id) !== customer.id) {
      throw new Error('Stripe TEST customer/subscription failed the synthetic tenant lifecycle checks.');
    }
    const clock = await stripe.testHelpers.testClocks.retrieve(customer.test_clock);
    if (clock.status !== 'ready' || clock.frozen_time >= subscription.current_period_end ||
        subscription.current_period_end > clock.frozen_time + 62 * 24 * 60 * 60) {
      throw new Error('Test Clock or subscription period is outside the safe one-period acceptance window.');
    }

    const configurations = await stripe.billingPortal.configurations.list({ limit: 100, active: true, is_default: true });
    const portalConfig = getPortalCancellationSettings(configurations.data[0]);
    if (!portalConfig.enabled || portalConfig.mode !== 'at_period_end') {
      throw new Error('Refusing to cancel: Billing Portal is not configured for end-of-period cancellation.');
    }
    const portalResponse = await fetch(`${target.previewOrigin}/api/stripe-portal`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${auth.session.access_token}`, 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
      body: '{}',
    });
    const portalPayload = await portalResponse.json().catch(() => null);
    if (!portalResponse.ok || typeof portalPayload?.url !== 'string') {
      throw new Error('Staging owner Billing Portal endpoint did not return an authorized session.');
    }
    const portalUrl = validateStagingStripePortalUrl(portalPayload.url);
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const readinessHandle = await page.waitForFunction(() => {
      const body = document.body;
      const style = body ? getComputedStyle(body) : null;
      const text = body?.innerText?.trim().toLowerCase() || '';
      const visibleCancel = [...document.querySelectorAll('button,a,[role=button]')].some((e) => {
        const s = getComputedStyle(e);
        const label = (e.innerText || e.getAttribute('aria-label') || '').trim();
        return e.getClientRects().length > 0 && s.visibility === 'visible' && Number(s.opacity) > 0 && /^cancel subscription$/i.test(label);
      });
      return document.readyState === 'complete' && style?.display !== 'none' && style?.visibility === 'visible' &&
        Number(style?.opacity) > 0 && (text.length >= 250 || /subscription|předplat/.test(text) || visibleCancel)
        ? { readyState: document.readyState, bodyTextLength: text.length, bodyDisplay: style.display,
            bodyVisibility: style.visibility, bodyOpacity: style.opacity,
            hasSubscriptionWords: /subscription|předplat/.test(text), cancellationActionVisible: visibleCancel }
        : false;
    }, null, { timeout: 30000 }).catch(() => null);
    const readiness = readinessHandle ? await readinessHandle.jsonValue() : null;
    if (!isPortalContentReady(readiness) || !readiness.cancellationActionVisible) {
      throw new Error('Billing Portal is not showing the verified subscription cancellation control.');
    }

    const cancelControl = page.getByText('Cancel subscription', { exact: true }).first();
    await cancelControl.click({ timeout: 10000 });
    let updated;
    for (let attempt = 0; attempt < 8; attempt += 1) {
      updated = await stripe.subscriptions.retrieve(subscription.id);
      if (updated.cancel_at_period_end) break;
      await wait(1000);
    }
    if (!updated.cancel_at_period_end) {
      const confirms = page.getByRole('button', { name: /^(cancel subscription|confirm cancellation|confirm cancel)$/i });
      for (let index = (await confirms.count()) - 1; index >= 0; index -= 1) {
        const confirm = confirms.nth(index);
        if (await confirm.isVisible()) {
          await confirm.click({ timeout: 5000, force: true });
          break;
        }
      }
      if (!updated.cancel_at_period_end) {
        for (let attempt = 0; attempt < 8; attempt += 1) {
          updated = await stripe.subscriptions.retrieve(subscription.id);
          if (updated.cancel_at_period_end) break;
          await wait(1000);
        }
      }
    }
    if (!updated.cancel_at_period_end || updated.status !== 'active' || updated.cancel_at !== subscription.current_period_end) {
      throw new Error('Portal did not schedule cancellation at the exact end of the current billing period.');
    }

    const beforeEnd = await companyBillingState(client, companyId);
    if (beforeEnd.subscription_status !== 'active') {
      throw new Error('Access changed before the scheduled billing period end.');
    }

    const targetTime = subscription.current_period_end + 60;
    await stripe.testHelpers.testClocks.advance(clock.id, { frozen_time: targetTime });
    const readyClock = await waitForClockReady(stripe, clock.id);
    const deadline = Date.now() + 120000;
    let endedSubscription;
    let afterEnd;
    while (Date.now() < deadline) {
      [endedSubscription, afterEnd] = await Promise.all([
        stripe.subscriptions.retrieve(subscription.id),
        companyBillingState(client, companyId),
      ]);
      if (endedSubscription.status === 'canceled' && afterEnd.subscription_status === 'canceled') break;
      await wait(2000);
    }
    if (endedSubscription?.status !== 'canceled' || afterEnd?.subscription_status !== 'canceled') {
      throw new Error(`End-of-period cancellation did not propagate: Stripe=${endedSubscription?.status ?? 'unknown'}, app=${afterEnd?.subscription_status ?? 'unknown'}.`);
    }

    return {
      target: 'StavbaCore Staging / Stripe TEST',
      companySlug: company.slug,
      cancellation: 'submitted through hosted Billing Portal; at_period_end confirmed',
      beforePeriodEnd: { stripeSubscriptionStatus: updated.status, appSubscriptionStatus: beforeEnd.subscription_status },
      clock: { status: readyClock.status, reachedPeriodEnd: readyClock.frozen_time >= subscription.current_period_end },
      afterPeriodEnd: { stripeSubscriptionStatus: endedSubscription.status, appSubscriptionStatus: afterEnd.subscription_status,
        accessExpected: 'blocked by canceled subscription' },
      verifiedAt: new Date().toISOString(),
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await client.auth.signOut().catch(() => {});
  }
}

if (process.argv[1] && new URL(import.meta.url).pathname.toLowerCase().endsWith('/cancel-staging-stripe-subscription.mjs')) {
  cancelAndAdvance().then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(JSON.stringify({ code: 'STAGING_STRIPE_CANCEL_TEST_FAILED',
        message: error instanceof Error ? error.message : 'Staging Stripe cancellation test failed.' }));
      process.exitCode = 1;
    });
}
