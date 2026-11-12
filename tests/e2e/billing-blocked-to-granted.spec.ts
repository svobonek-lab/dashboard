import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';
import { expect, test } from 'playwright/test';
import { requiredValue, signIn, stagingConfig } from './support';

const COMPANY_C_SLUG = 'e2e-synthetic-company-c';
const OWNER_C_EMAIL = 'billing-owner-c@stavbaflow.example.test';
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

function stripeClients() {
  const { url } = stagingConfig();
  const serviceKey = requiredValue('STAGING_SUPABASE_SERVICE_ROLE_KEY');
  const service = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
  const stripe = new Stripe(requiredValue('STRIPE_SECRET_KEY'));
  assert.match(requiredValue('STRIPE_SECRET_KEY'), /^(?:sk|rk)_test_[A-Za-z0-9]+$/);
  assert.equal(requiredValue('STRIPE_BILLING_MODE'), 'test');
  return { service, stripe };
}

function parseSessionId(checkoutUrl: string) {
  const url = new URL(checkoutUrl);
  assert.equal(url.protocol, 'https:');
  assert.equal(url.hostname, 'checkout.stripe.com');
  const match = /(?:^|\/)(cs_test_[A-Za-z0-9_]+)(?:\/|$)/.exec(url.pathname);
  assert.ok(match, 'Hosted Checkout did not contain a Stripe TEST session ID.');
  return match[1];
}

async function fillStripeCard(page: import('playwright/test').Page, selectors: string[], value: string) {
  const deadline = Date.now() + 12_000;
  while (Date.now() < deadline) {
    for (const frame of page.frames()) {
      for (const selector of selectors) {
        const input = frame.locator(selector).first();
        if (await input.count() && await input.isVisible().catch(() => false)) {
          await input.fill(value);
          return true;
        }
      }
    }
    await wait(250);
  }
  return false;
}

test('company C owner is blocked before Stripe TEST payment and reaches /dashboard only after the signed webhook', async ({ page }, testInfo) => {
  const phase = requiredValue('STAGING_BILLING_PHASE');
  assert.ok(phase === 'prepare' || phase === 'verify', 'Billing acceptance phase must be prepare or verify.');
  test.setTimeout(phase === 'prepare' ? 6 * 60_000 : 35 * 60_000);
  const { service, stripe } = stripeClients();
  const companyResult = await service.from('app_companies')
    .select('id,slug,active,plan,subscription_status,stripe_customer_id,stripe_subscription_id,stripe_event_created_at')
    .eq('slug', COMPANY_C_SLUG).maybeSingle();
  assert.equal(companyResult.error, null, 'Could not inspect synthetic company C on staging.');
  const company = companyResult.data;
  assert.ok(company, 'Synthetic company C has not been provisioned on staging.');
  assert.equal(company.slug, COMPANY_C_SLUG);
  assert.equal(company.active, true);
  assert.equal(company.plan, 'starter');

  if (phase === 'prepare') {
    assert.notEqual(company.subscription_status, 'active', 'Company C was active before payment.');
    assert.notEqual(company.subscription_status, 'trialing', 'Company C was trialing before payment.');
    assert.equal(company.stripe_subscription_id, null, 'Company C already has a Stripe subscription binding.');
    if (company.stripe_customer_id !== null) {
      assert.match(company.stripe_customer_id, /^cus_[A-Za-z0-9]+$/, 'Company C has an invalid Stripe TEST customer binding.');
    }

    await signIn(page, 'OWNER_C');
    await expect(page).toHaveURL(/\/dashboard\/?$/);
    await expect(page.getByRole('heading', { name: 'Předplatné vypršelo' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Otevřít platební stránku' })).toBeVisible();
    await testInfo.attach('company-c-blocked-before-payment', { body: await page.screenshot(), contentType: 'image/png' });

    await Promise.all([
      page.waitForURL(url => url.hostname === 'checkout.stripe.com', { timeout: 45_000 }),
      page.getByRole('button', { name: 'Otevřít platební stránku' }).click(),
    ]);
    const checkoutUrl = page.url();
    const sessionId = parseSessionId(checkoutUrl);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const lineItems = await stripe.checkout.sessions.listLineItems(sessionId, { limit: 2 });
    const linePriceId = typeof lineItems.data[0]?.price === 'string' ? lineItems.data[0].price : lineItems.data[0]?.price?.id;
    assert.equal(session.livemode, false, 'Checkout session is not Stripe TEST mode.');
    assert.equal(session.mode, 'subscription');
    assert.equal(session.status, 'open');
    assert.equal(session.metadata?.tenant_id, company.id);
    assert.equal(session.metadata?.plan, 'starter');
    assert.equal(lineItems.data.length, 1);
    assert.equal(lineItems.data[0]?.quantity, 1);
    assert.equal(linePriceId, requiredValue('STRIPE_PRICE_STARTER_ID'));
    assert.ok(session.customer, 'Stripe TEST Checkout did not bind a customer.');
    if (company.stripe_customer_id) {
      assert.equal(session.customer, company.stripe_customer_id, 'Checkout did not reuse company C’s existing Stripe TEST customer.');
    }

    const handoffFile = requiredValue('STAGING_BILLING_HANDOFF_FILE');
    await mkdir(path.dirname(handoffFile), { recursive: true });
    await writeFile(handoffFile, JSON.stringify({ checkoutUrl, sessionId, companyId: company.id }, null, 2), { mode: 0o600 });

    const cardNumberReady = await fillStripeCard(page, ['input[name="cardnumber"]', 'input[autocomplete="cc-number"]'], '4242424242424242');
    if (cardNumberReady) {
      const expiryReady = await fillStripeCard(page, ['input[name="exp-date"]', 'input[autocomplete="cc-exp"]'], '1234');
      const cvcReady = await fillStripeCard(page, ['input[name="cvc"]', 'input[autocomplete="cc-csc"]'], '123');
      if (expiryReady && cvcReady) {
        const submit = page.locator('button[type="submit"]:visible').last();
        if (await submit.count()) await submit.click().catch(() => {});
      }
    }
    await testInfo.attach('company-c-checkout-session', {
      body: JSON.stringify({ sessionId, companyId: company.id, cardEntryAutomated: cardNumberReady }),
      contentType: 'application/json',
    });
    return;
  }

  const handoffFile = requiredValue('STAGING_BILLING_HANDOFF_FILE');
  const handoff = JSON.parse(await readFile(handoffFile, 'utf8')) as { checkoutUrl?: unknown; sessionId?: unknown; companyId?: unknown };
  assert.equal(handoff.companyId, company.id, 'Checkout handoff belongs to a different company.');
  assert.equal(typeof handoff.checkoutUrl, 'string');
  assert.equal(typeof handoff.sessionId, 'string');
  const sessionId = String(handoff.sessionId);
  assert.match(sessionId, /^cs_test_[A-Za-z0-9_]+$/);
  assert.equal(parseSessionId(String(handoff.checkoutUrl)), sessionId);

  const deadline = Date.now() + 30 * 60_000;
  let paidSession: Stripe.Checkout.Session | null = null;
  let webhookEvent: Stripe.Event | null = null;
  let companyEventBindingVerified = false;
  let activatedCompany: Record<string, unknown> | null = null;
  let activeSubscription: Stripe.Subscription | null = null;
  while (Date.now() < deadline) {
    paidSession = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] });
    const subscriptionId = typeof paidSession.subscription === 'string'
      ? paidSession.subscription : paidSession.subscription?.id;
    const companyRead = await service.from('app_companies')
      .select('id,slug,active,plan,subscription_status,stripe_customer_id,stripe_subscription_id,stripe_event_created_at')
      .eq('id', company.id).maybeSingle();
    if (companyRead.error) throw new Error('Unable to verify company C after Checkout.');
    activatedCompany = companyRead.data as Record<string, unknown> | null;

    if (paidSession.status === 'complete' && paidSession.payment_status === 'paid' && subscriptionId && activatedCompany?.subscription_status === 'active' &&
        activatedCompany.stripe_customer_id === paidSession.customer && activatedCompany.stripe_subscription_id === subscriptionId) {
      const eventList = await stripe.events.list({ type: 'checkout.session.completed', created: { gte: paidSession.created - 30 }, limit: 100 });
      webhookEvent = eventList.data.find(event => {
        const checkout = event.data.object as Stripe.Checkout.Session;
        const eventSubscriptionId = typeof checkout.subscription === 'string'
          ? checkout.subscription : checkout.subscription?.id;
        return event.livemode === false && checkout.id === sessionId && checkout.metadata?.tenant_id === company.id &&
          checkout.customer === paidSession!.customer && eventSubscriptionId === subscriptionId;
      }) || null;
      if (webhookEvent) {
        const companyEventCreatedAt = Date.parse(String(activatedCompany?.stripe_event_created_at ?? ''));
        companyEventBindingVerified = Number.isFinite(companyEventCreatedAt) &&
          Math.floor(companyEventCreatedAt / 1000) === webhookEvent.created;
        if (companyEventBindingVerified) {
          activeSubscription = typeof paidSession.subscription === 'string'
            ? await stripe.subscriptions.retrieve(subscriptionId)
            : paidSession.subscription as Stripe.Subscription;
          if (activeSubscription.status === 'active' && activeSubscription.livemode === false) break;
        }
      }
    }
    await wait(2_000);
  }

  assert.ok(paidSession && paidSession.status === 'complete' && paidSession.payment_status === 'paid', 'Stripe TEST Checkout was not completed as paid.');
  assert.ok(webhookEvent, 'Stripe did not create the signed checkout.session.completed event for this session.');
  assert.ok(companyEventBindingVerified, 'The company webhook event timestamp does not include this Checkout event.');
  assert.ok(activatedCompany?.subscription_status === 'active', 'The company C subscription status did not become active.');
  assert.ok(activeSubscription?.status === 'active' && activeSubscription.livemode === false, 'The Stripe TEST subscription is not active.');

  await page.goto('/dashboard', { waitUntil: 'domcontentloaded' });
  await signIn(page, 'OWNER_C');
  await expect(page).toHaveURL(/\/dashboard\/?$/);
  await expect(page.getByRole('heading', { name: 'Předplatné vypršelo' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Otevřít platební stránku' })).toHaveCount(0);
  await expect(page.getByText('Přehled stavby (Executive)', { exact: true }).first()).toBeVisible();

  await testInfo.attach('company-c-paid-webhook-result', {
    body: JSON.stringify({ companyId: company.id, checkoutSessionId: sessionId, stripeEventId: webhookEvent!.id, webhookEventObserved: true, companyEventBindingVerified, subscriptionStatus: 'active' }),
    contentType: 'application/json',
  });
});
