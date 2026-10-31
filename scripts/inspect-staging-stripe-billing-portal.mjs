import Stripe from 'stripe';
import { chromium } from 'playwright';
import { createClient } from '@supabase/supabase-js';

import {
  getPortalCancellationSettings,
  isPortalDocumentReady,
  summarizePortalFrames,
  validateStagingStripeLifecycle,
  validateStagingStripePortalUrl,
} from './staging-stripe-lifecycle-guard.mjs';

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`Missing required configuration: ${name}`);
  return value;
}

function companyFrom(data, expectedId) {
  if (!data || data.id !== expectedId || data.slug !== 'e2e-synthetic-company-a') {
    throw new Error('Configured owner is not attached to synthetic company A.');
  }
  if (data.active !== true || data.plan !== 'starter' || data.subscription_status !== 'active' ||
      typeof data.stripe_customer_id !== 'string' || typeof data.stripe_subscription_id !== 'string') {
    throw new Error('Synthetic company A does not have an active TEST Starter subscription.');
  }
  return data;
}

async function inspectPortal(env = process.env) {
  const target = validateStagingStripeLifecycle(env);
  const companyId = required(env, 'STAGING_COMPANY_A_ID');
  const authClient = createClient(env.STAGING_SUPABASE_URL, env.STAGING_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  let browser;
  try {
    const { data: auth, error: authError } = await authClient.auth.signInWithPassword({
      email: required(env, 'STAGING_OWNER_A_EMAIL'),
      password: required(env, 'STAGING_OWNER_A_PASSWORD'),
    });
    if (authError || !auth.user || !auth.session?.access_token ||
        auth.user.email?.toLowerCase() !== 'owner-a@stavbaflow.example.test') {
      throw new Error('Synthetic owner A sign-in did not resolve to the expected fixture account.');
    }

    const { data: memberships, error: membershipError } = await authClient
      .from('app_members')
      .select('company_id,role,active')
      .eq('user_id', auth.user.id)
      .eq('active', true);
    if (membershipError || !Array.isArray(memberships) || memberships.length !== 1 ||
        memberships[0].company_id !== companyId || memberships[0].role !== 'owner') {
      throw new Error('Synthetic owner A does not have exactly one active owner membership in company A.');
    }

    const { data: visibleCompany, error: companyError } = await authClient
      .from('app_companies')
      .select('id,slug,active,plan,subscription_status,stripe_customer_id,stripe_subscription_id')
      .eq('id', companyId)
      .maybeSingle();
    if (companyError) throw new Error('Authenticated owner could not read its company billing state.');
    const company = companyFrom(visibleCompany, companyId);

    const stripe = new Stripe(env.STRIPE_SECRET_KEY);
    const [customer, subscription] = await Promise.all([
      stripe.customers.retrieve(company.stripe_customer_id),
      stripe.subscriptions.retrieve(company.stripe_subscription_id),
    ]);
    if (customer.deleted || customer.livemode || customer.metadata?.tenant_id !== companyId ||
        customer.metadata?.purpose !== 'staging-billing-acceptance' || !customer.test_clock ||
        subscription.livemode || subscription.status !== 'active' ||
        (typeof subscription.customer === 'string' ? subscription.customer : subscription.customer.id) !== customer.id ||
        subscription.cancel_at_period_end) {
      throw new Error('Bound Stripe customer or subscription failed the TEST lifecycle checks.');
    }
    const portalConfigurations = await stripe.billingPortal.configurations.list({
      limit: 100,
      active: true,
      is_default: true,
    });
    const portalCancellation = getPortalCancellationSettings(portalConfigurations.data[0]);

    const portalResponse = await fetch(`${target.previewOrigin}/api/stripe-portal`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${auth.session.access_token}`,
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
      },
      body: '{}',
    });
    const payload = await portalResponse.json().catch(() => null);
    if (!portalResponse.ok || typeof payload?.url !== 'string') {
      throw new Error('Staging Billing Portal endpoint did not return an authorized portal session.');
    }
    const portalUrl = validateStagingStripePortalUrl(payload.url);

    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.name || 'PageError'));
    const browserResponse = await page.goto(portalUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    const readinessHandle = await page.waitForFunction(() => {
      const body = document.body;
      const style = body ? getComputedStyle(body) : null;
      const state = {
        readyState: document.readyState,
        bodyTextLength: body?.innerText?.trim().length ?? 0,
        bodyDisplay: style?.display ?? null,
        bodyVisibility: style?.visibility ?? null,
        bodyOpacity: style?.opacity ?? null,
      };
      return state.readyState === 'complete' && state.bodyTextLength > 0 &&
        state.bodyDisplay !== 'none' && state.bodyVisibility === 'visible' && Number(state.bodyOpacity) > 0
        ? state
        : false;
    }, null, { timeout: 30000 }).catch(() => null);
    const readiness = readinessHandle ? await readinessHandle.jsonValue() : await page.evaluate(() => {
        const body = document.body;
        const style = body ? getComputedStyle(body) : null;
        return {
          readyState: document.readyState,
          bodyTextLength: body?.innerText?.length ?? 0,
          bodyDisplay: style?.display ?? null,
          bodyVisibility: style?.visibility ?? null,
          bodyOpacity: style?.opacity ?? null,
          bodyClass: body?.className ?? null,
        };
      });
    if (!isPortalDocumentReady(readiness)) {
      throw new Error(`Stripe portal document did not become visible (HTTP ${browserResponse?.status() ?? 'unknown'}; page errors: ${pageErrors.join(',') || 'none'}; diagnostics: ${JSON.stringify(readiness)}).`);
    }
    const frameStates = await Promise.all(page.frames().map((frame) => frame.evaluate(() => {
      const controls = [...document.querySelectorAll('button,a,[role=button]')]
        .filter((element) => {
          const style = getComputedStyle(element);
          return element.getClientRects().length > 0 && style.visibility === 'visible' && Number(style.opacity) > 0;
        });
      const labels = controls.map((element) => (element.innerText || element.getAttribute('aria-label') || '').trim())
        .filter(Boolean)
        .slice(0, 20);
      const text = document.body?.innerText?.toLowerCase() || '';
      return {
        title: document.title,
        bodyTextLength: text.length,
        hasSubscriptionWords: /subscription|předplat|abo/.test(text),
        saysNoSubscription: /no (active )?subscriptions?|no subscription/i.test(text),
        visibleControlCount: controls.length,
        billingContentVisible: /subscription|předplat|billing|faktur|payment|platb|abo/.test(text),
        visibleActions: labels,
      };
    }).then((state) => {
      try { state.host = new URL(frame.url()).hostname || 'unknown'; } catch { state.host = 'unknown'; }
      return state;
    }).catch(() => null)));
    const portalState = summarizePortalFrames(frameStates);
    if (!portalState.billingContentVisible) throw new Error('Stripe Billing Portal opened without recognizable billing content.');
    return {
      target: 'StavbaCore Staging / Stripe TEST',
      projectRef: target.projectRef,
      companySlug: company.slug,
      ownerMembership: 'active owner; exact synthetic company A only',
      ownerCompanyRead: true,
      subscription: 'active TEST Starter; cancellation not requested',
      portalDomain: new URL(portalUrl).hostname,
      portalTitle: portalState.title,
      cancellationActionVisible: portalState.cancellationActionVisible,
      visibleActions: portalState.visibleActions,
      cancellationEnabledInDefaultPortalConfiguration: portalCancellation.enabled,
      cancellationMode: portalCancellation.mode,
      frameCount: portalState.frameCount,
      frameDiagnostics: portalState.frameDiagnostics,
      inspectedAt: new Date().toISOString(),
    };
  } finally {
    if (browser) await browser.close().catch(() => {});
    await authClient.auth.signOut().catch(() => {});
  }
}

if (process.argv[1] && new URL(import.meta.url).pathname.toLowerCase().endsWith('/inspect-staging-stripe-billing-portal.mjs')) {
  inspectPortal().then((result) => console.log(JSON.stringify(result)))
    .catch((error) => {
      console.error(JSON.stringify({ code: 'STAGING_BILLING_PORTAL_INSPECTION_FAILED', message: error instanceof Error ? error.message : 'Staging billing portal inspection failed.' }));
      process.exitCode = 1;
    });
}
