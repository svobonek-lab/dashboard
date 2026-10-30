import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

import {
  assertSyntheticCompanyA,
  formatSafeBillingSetupLog,
  validateStagingBillingSetup,
} from './staging-stripe-checkout-guard.mjs';

function required(env, key) {
  const value = String(env[key] || '').trim();
  if (!value) throw new Error(`Missing required configuration: ${key}`);
  return value;
}

export function billingAcceptanceOperationId(companyId) {
  const bytes = createHash('sha256').update(`stavbaflow-stripe-acceptance:${companyId}`).digest().subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString('hex');
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

async function main(env = process.env) {
  const target = validateStagingBillingSetup(env);
  const previewUrl = new URL(env.STAGING_PREVIEW_URL).origin;
  const supabase = createClient(env.STAGING_SUPABASE_URL, env.STAGING_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const service = createClient(env.STAGING_SUPABASE_URL, env.STAGING_SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const stripe = new Stripe(env.STRIPE_SECRET_KEY);

  const { data: company, error: companyError } = await service
    .from('app_companies')
    .select('id,slug,plan,active,stripe_customer_id,stripe_subscription_id')
    .eq('id', env.STAGING_COMPANY_A_ID)
    .maybeSingle();
  if (companyError || !company) throw new Error('Could not verify the configured staging company A.');
  assertSyntheticCompanyA(company, env.STAGING_COMPANY_A_ID);
  if (company.active !== true || company.plan !== 'starter') {
    throw new Error('Synthetic company A must be active and on the Starter plan before billing acceptance.');
  }
  if (company.stripe_subscription_id) {
    throw new Error('Synthetic company A already has a Stripe subscription; refusing to create another acceptance subscription.');
  }

  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: required(env, 'STAGING_OWNER_A_EMAIL'),
    password: required(env, 'STAGING_OWNER_A_PASSWORD'),
  });
  if (authError || !authData.user || !authData.session?.access_token ||
      authData.user.email?.toLowerCase() !== 'owner-a@stavbaflow.example.test') {
    throw new Error('Synthetic owner A sign-in failed or resolved to a non-synthetic account.');
  }
  const accessToken = authData.session.access_token;
  const { data: memberships, error: memberError } = await service
    .from('app_members')
    .select('company_id,role,active')
    .eq('user_id', authData.user.id)
    .eq('active', true);
  if (memberError || !Array.isArray(memberships) || memberships.length !== 1 ||
      memberships[0].company_id !== company.id || memberships[0].role !== 'owner') {
    throw new Error('The staging owner A account is not the single active owner of synthetic company A.');
  }

  const price = await stripe.prices.retrieve(env.STRIPE_PRICE_STARTER_ID);
  if (!price.active || price.livemode || price.type !== 'recurring' || price.recurring?.interval !== 'month') {
    throw new Error('Configured Starter price is not an active monthly Stripe TEST price.');
  }

  const marker = { tenant_id: company.id, purpose: 'staging-billing-acceptance' };
  const search = await stripe.customers.search({
    query: `metadata['tenant_id']:'${company.id}' AND metadata['purpose']:'staging-billing-acceptance'`,
    limit: 2,
  });
  if (search.data.length > 1) throw new Error('More than one billing acceptance customer exists for synthetic company A; refusing to choose.');

  let customer;
  let testClockId;
  const boundCustomerId = typeof company.stripe_customer_id === 'string' ? company.stripe_customer_id : null;
  if (boundCustomerId) {
    customer = await stripe.customers.retrieve(boundCustomerId);
    if (customer.deleted || customer.metadata?.tenant_id !== company.id || customer.metadata?.purpose !== marker.purpose) {
      throw new Error('Company A has a Stripe customer that is not the isolated billing acceptance customer.');
    }
    if (search.data[0] && search.data[0].id !== boundCustomerId) {
      throw new Error('Bound Stripe customer does not match the isolated acceptance customer.');
    }
    testClockId = customer.test_clock;
    if (!testClockId) throw new Error('Bound acceptance customer is not attached to a Stripe Test Clock.');
  } else if (search.data[0]) {
    customer = search.data[0];
    testClockId = customer.test_clock;
    if (!testClockId) throw new Error('Existing acceptance customer is not attached to a Stripe Test Clock.');
    const { error: bindError } = await service.rpc('app_bind_stripe_customer', {
      p_company_id: company.id,
      p_stripe_customer_id: customer.id,
    });
    if (bindError) throw new Error('Could not bind the existing Stripe TEST customer to synthetic company A.');
  } else {
    const clockName = 'StavbaFlow synthetic company A billing acceptance';
    const clocks = await stripe.testHelpers.testClocks.list({ limit: 100 });
    const namedClocks = clocks.data.filter((candidate) => candidate.name === clockName);
    if (namedClocks.length > 1 || (clocks.has_more && namedClocks.length === 0)) {
      throw new Error('Could not safely identify the single existing company A billing Test Clock.');
    }
    const clock = namedClocks[0]
      ? await stripe.testHelpers.testClocks.retrieve(namedClocks[0].id)
      : await stripe.testHelpers.testClocks.create({
        frozen_time: Math.floor(Date.now() / 60_000) * 60,
        name: clockName,
      }, { idempotencyKey: `stavbaflow-billing-clock:${company.id}` });
    if (clock.livemode || clock.status !== 'ready') {
      throw new Error('Company A billing Test Clock is not ready in Stripe TEST mode.');
    }
    testClockId = clock.id;
    customer = await stripe.customers.create({
      email: authData.user.email || env.STAGING_OWNER_A_EMAIL,
      name: 'StavbaFlow synthetic billing acceptance A',
      test_clock: testClockId,
      metadata: marker,
    }, { idempotencyKey: `stavbaflow-billing-customer:${company.id}:${testClockId}` });
    const { error: bindError } = await service.rpc('app_bind_stripe_customer', {
      p_company_id: company.id,
      p_stripe_customer_id: customer.id,
    });
    if (bindError) throw new Error('Could not bind the new Stripe TEST customer to synthetic company A.');
  }
  const verifiedClock = await stripe.testHelpers.testClocks.retrieve(testClockId);
  if (verifiedClock.livemode || verifiedClock.status !== 'ready' ||
      verifiedClock.name !== 'StavbaFlow synthetic company A billing acceptance') {
    throw new Error('Bound customer is not attached to the approved ready Stripe TEST Test Clock.');
  }

  const recentSessions = await stripe.checkout.sessions.list({ customer: customer.id, limit: 100 });
  const existingAcceptanceSessions = recentSessions.data.filter((candidate) =>
    candidate.metadata?.tenant_id === company.id && candidate.metadata?.plan === 'starter');
  if (existingAcceptanceSessions.length > 1) {
    throw new Error('Multiple Checkout sessions exist for company A; refusing to choose one.');
  }
  if (existingAcceptanceSessions[0] && existingAcceptanceSessions[0].status !== 'open') {
    throw new Error('A prior Checkout session for company A is already complete or expired; refusing to create another subscription session.');
  }

  let session;
  if (existingAcceptanceSessions[0]) {
    session = await stripe.checkout.sessions.retrieve(existingAcceptanceSessions[0].id);
  } else {
    const checkoutResponse = await fetch(`${previewUrl}/api/stripe-checkout`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'X-StavbaFlow-Idempotency-Key': billingAcceptanceOperationId(company.id),
        'Cache-Control': 'no-store',
      },
    });
    const checkoutPayload = await checkoutResponse.json().catch(() => null);
    if (!checkoutResponse.ok || typeof checkoutPayload?.url !== 'string') {
      throw new Error(`Staging Checkout endpoint refused the request (HTTP ${checkoutResponse.status}).`);
    }
    const returnedUrl = new URL(checkoutPayload.url);
    const returnedSessionId = /(?:^|\/)(cs_test_[A-Za-z0-9_]+)(?:\/|$|\?)/.exec(returnedUrl.pathname)?.[1];
    if (returnedUrl.protocol !== 'https:' || returnedUrl.hostname !== 'checkout.stripe.com' || !returnedSessionId) {
      throw new Error('Staging Checkout did not return a Stripe TEST Checkout session URL.');
    }
    session = await stripe.checkout.sessions.retrieve(returnedSessionId);
  }
  const sessionId = session.id;
  if (!session.url) throw new Error('Stripe TEST Checkout session no longer has a hosted URL.');
  const checkoutUrl = new URL(session.url);
  if (checkoutUrl.protocol !== 'https:' || checkoutUrl.hostname !== 'checkout.stripe.com') {
    throw new Error('Stripe returned a Checkout URL outside its hosted payment domain.');
  }
  const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { limit: 10 });
  const linePriceId = typeof lineItems.data[0]?.price === 'string'
    ? lineItems.data[0].price
    : lineItems.data[0]?.price?.id;
  if (session.livemode || session.mode !== 'subscription' || session.customer !== customer.id ||
      session.metadata?.tenant_id !== company.id || session.metadata?.plan !== 'starter' ||
      lineItems.data.length !== 1 || linePriceId !== env.STRIPE_PRICE_STARTER_ID ||
      lineItems.data[0].quantity !== 1) {
    throw new Error('Created Checkout session does not match the isolated synthetic company A TEST subscription.');
  }

  const outputDir = path.resolve(required(env, 'STAGING_BILLING_ARTIFACT_DIR'));
  await mkdir(outputDir, { recursive: true });
  await writeFile(path.join(outputDir, 'checkout-url.txt'), `${checkoutUrl.toString()}\n`, { mode: 0o600, flag: 'wx' });
  await writeFile(path.join(outputDir, 'safe-metadata.json'), JSON.stringify({
    target: 'StavbaCore Staging / Stripe TEST',
    projectRef: target.projectRef,
    previewOrigin: target.previewOrigin,
    companySlug: company.slug,
    customerId: customer.id,
    testClockId,
    sessionId: session.id,
    preparedAt: new Date().toISOString(),
  }, null, 2) + '\n', { mode: 0o600, flag: 'wx' });
  console.log(formatSafeBillingSetupLog({
    projectRef: target.projectRef,
    companySlug: company.slug,
    customerId: customer.id,
    testClockId,
    checkoutUrl: checkoutUrl.toString(),
    accessToken,
  }));
  await supabase.auth.signOut();
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main().catch((error) => {
    const code = typeof error?.code === 'string' ? error.code : 'STAGING_BILLING_SETUP_FAILED';
    console.error(JSON.stringify({ code, message: error instanceof Error ? error.message : 'Staging billing setup failed.' }));
    process.exitCode = 1;
  });
}
