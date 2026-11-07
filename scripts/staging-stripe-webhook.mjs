import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import Stripe from 'stripe';

const REPOSITORY = 'svobonek-lab/dashboard';
const BRANCH = 'codex/billing-blocked-to-granted';
const STAGING_HOST = 'dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app';
const EVENTS = [
  'checkout.session.completed',
  'customer.subscription.updated',
  'customer.subscription.deleted',
];
const PURPOSE = 'stavbaflow-pr156-billing-acceptance';

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value || /[\r\n\0]/.test(value)) throw new Error(`Required staging webhook setting is missing or invalid: ${name}.`);
  return value;
}

export function buildStagingWebhookEndpointParams(env) {
  if (env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_REF !== `refs/heads/${BRANCH}`) {
    throw new Error('Refusing to manage a billing webhook outside the approved repository branch.');
  }
  const runId = required(env, 'GITHUB_RUN_ID');
  if (!/^\d{1,20}$/.test(runId)) throw new Error('The staging billing run ID is invalid.');
  const attempt = required(env, 'GITHUB_RUN_ATTEMPT');
  if (!/^\d{1,3}$/.test(attempt)) throw new Error('The staging billing run attempt is invalid.');
  const stripeSecret = required(env, 'STAGING_STRIPE_SECRET_KEY');
  if (!/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(stripeSecret)) throw new Error('Refusing to manage a webhook outside Stripe TEST mode.');
  const preview = new URL(required(env, 'STAGING_PREVIEW_URL'));
  const production = new URL(required(env, 'PRODUCTION_BASE_URL'));
  if (preview.protocol !== 'https:' || preview.hostname !== STAGING_HOST || preview.origin === production.origin) {
    throw new Error('Refusing to create a webhook outside the exact isolated staging Preview.');
  }

  return {
    url: `${preview.origin}/api/stripe-webhook?staging_billing_run_id=${runId}&staging_billing_attempt=${attempt}`,
    enabled_events: EVENTS,
    description: `StavbaFlow PR 156 Stripe TEST billing run ${runId} attempt ${attempt}`,
    metadata: { purpose: PURPOSE, github_run_id: runId, github_run_attempt: attempt },
  };
}

export function validateStagingWebhookEndpoint(endpoint, env) {
  const params = buildStagingWebhookEndpointParams(env);
  if (!endpoint || endpoint.livemode !== false || endpoint.url !== params.url ||
      endpoint.description !== params.description || !Array.isArray(endpoint.enabled_events) ||
      EVENTS.some((event) => !endpoint.enabled_events.includes(event)) ||
      endpoint.metadata?.purpose !== params.metadata.purpose ||
      endpoint.metadata?.github_run_id !== params.metadata.github_run_id ||
      endpoint.metadata?.github_run_attempt !== params.metadata.github_run_attempt) {
    throw new Error('The staging billing webhook endpoint does not match this run.');
  }
  return endpoint;
}

export async function createStagingWebhookEndpoint(stripe, env) {
  const params = buildStagingWebhookEndpointParams(env);
  const runId = env.GITHUB_RUN_ID;
  const attempt = env.GITHUB_RUN_ATTEMPT;
  const endpoint = await stripe.webhookEndpoints.create(params, { idempotencyKey: `stavbaflow-pr156-${runId}-${attempt}` });
  validateStagingWebhookEndpoint(endpoint, env);
  if (!/^we_[A-Za-z0-9]+$/.test(endpoint.id) || !/^whsec_[A-Za-z0-9]+$/.test(String(endpoint.secret || ''))) {
    throw new Error('Stripe did not return a valid staging TEST webhook endpoint.');
  }

  const endpointFile = required(env, 'STAGING_WEBHOOK_ENDPOINT_FILE');
  try {
    await mkdir(dirname(endpointFile), { recursive: true });
    await writeFile(endpointFile, JSON.stringify({ endpointId: endpoint.id, runId, attempt, mayServe: false, aliased: false }), { mode: 0o600 });
  } catch {
    await stripe.webhookEndpoints.del(endpoint.id).catch(() => {});
    throw new Error('Could not persist the staging webhook cleanup record.');
  }
  return { endpointId: endpoint.id, secret: endpoint.secret };
}

async function updateWebhookEndpointRecord(env, update) {
  const endpointFile = required(env, 'STAGING_WEBHOOK_ENDPOINT_FILE');
  let record;
  try { record = JSON.parse(await readFile(endpointFile, 'utf8')); }
  catch { throw new Error('The staging billing webhook cleanup record is missing or invalid.'); }
  if (record?.runId !== required(env, 'GITHUB_RUN_ID') || record?.attempt !== required(env, 'GITHUB_RUN_ATTEMPT') ||
      !/^we_[A-Za-z0-9]+$/.test(String(record?.endpointId || ''))) {
    throw new Error('Refusing to update a different staging billing webhook endpoint.');
  }
  await writeFile(endpointFile, JSON.stringify({ ...record, ...update }), { mode: 0o600 });
}

export async function markStagingWebhookEndpointMayServe(env) {
  await updateWebhookEndpointRecord(env, { mayServe: true });
}

export async function markStagingWebhookEndpointAliased(env) {
  await updateWebhookEndpointRecord(env, { mayServe: true, aliased: true });
}

function isPreviousManagedStagingEndpoint(endpoint, env) {
  if (!endpoint || endpoint.livemode !== false || endpoint.metadata?.purpose !== PURPOSE ||
      !/^we_[A-Za-z0-9]+$/.test(String(endpoint.id || '')) || !Array.isArray(endpoint.enabled_events) ||
      endpoint.enabled_events.length !== EVENTS.length ||
      EVENTS.some(event => !endpoint.enabled_events.includes(event))) return false;
  const runId = String(endpoint.metadata?.github_run_id || '');
  const attempt = String(endpoint.metadata?.github_run_attempt || '');
  if (!/^\d{1,20}$/.test(runId) || !/^\d{1,3}$/.test(attempt)) return false;
  if (endpoint.description !== `StavbaFlow PR 156 Stripe TEST billing run ${runId} attempt ${attempt}`) return false;
  let url;
  let staging;
  try {
    url = new URL(String(endpoint.url || ''));
    staging = new URL(required(env, 'STAGING_PREVIEW_URL'));
  } catch { return false; }
  if (url.protocol !== 'https:' || url.origin !== staging.origin || url.pathname !== '/api/stripe-webhook' ||
      url.searchParams.get('staging_billing_run_id') !== runId ||
      url.searchParams.get('staging_billing_attempt') !== attempt ||
      url.searchParams.size !== 2) return false;
  return true;
}

async function retireOlderManagedStagingEndpoints(stripe, currentId, env) {
  let page = await stripe.webhookEndpoints.list({ limit: 100 });
  const candidates = [];
  while (true) {
    for (const endpoint of page.data || []) {
      if (endpoint.id !== currentId && isPreviousManagedStagingEndpoint(endpoint, env)) candidates.push(endpoint.id);
    }
    if (!page.has_more || !page.data?.length) break;
    page = await stripe.webhookEndpoints.list({ limit: 100, starting_after: page.data.at(-1).id });
  }
  for (const endpointId of candidates) await stripe.webhookEndpoints.del(endpointId);
  const retiredCount = candidates.length;
  return retiredCount;
}

export async function cleanupStagingWebhookEndpoint(stripe, env) {
  const endpointFile = required(env, 'STAGING_WEBHOOK_ENDPOINT_FILE');
  let record;
  try { record = JSON.parse(await readFile(endpointFile, 'utf8')); }
  catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw new Error('The staging webhook cleanup record is invalid.');
  }
  const expectedRunId = required(env, 'GITHUB_RUN_ID');
  const expectedAttempt = required(env, 'GITHUB_RUN_ATTEMPT');
  if (record?.runId !== expectedRunId || record?.attempt !== expectedAttempt || !/^we_[A-Za-z0-9]+$/.test(String(record?.endpointId || ''))) {
    throw new Error('Refusing to remove a different staging billing webhook endpoint.');
  }
  const endpoint = await stripe.webhookEndpoints.retrieve(record.endpointId);
  validateStagingWebhookEndpoint(endpoint, env);
  if (record.mayServe !== true) {
    await stripe.webhookEndpoints.del(endpoint.id);
    return true;
  }
  const retiredCount = record.aliased === true
    ? await retireOlderManagedStagingEndpoints(stripe, endpoint.id, env)
    : 0;
  return { retained: true, retiredCount };
}

function stripeClient(env) {
  const apiKey = required(env, 'STAGING_STRIPE_SECRET_KEY');
  if (!/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(apiKey)) throw new Error('Refusing Stripe webhook management outside TEST mode.');
  return new Stripe(apiKey);
}

async function main() {
  const env = process.env;
  try {
    const stripe = stripeClient(env);
    const command = process.argv[2];
    if (command === 'create') {
      const created = await createStagingWebhookEndpoint(stripe, env);
      process.stdout.write(`::add-mask::${created.secret}\n`);
      console.log(`Created temporary Stripe TEST webhook endpoint ${created.endpointId} for run ${env.GITHUB_RUN_ID}, attempt ${env.GITHUB_RUN_ATTEMPT}.`);
      return;
    }
    if (command === 'cleanup') {
      const removed = await cleanupStagingWebhookEndpoint(stripe, env);
      if (removed === true) console.log('Removed the unused Stripe TEST webhook endpoint.');
      else if (removed && removed.retained) console.log(`Kept the Stripe TEST webhook serving the isolated staging Preview and retired ${removed.retiredCount} older run endpoint(s).`);
      else console.log('No Stripe TEST webhook endpoint needed cleanup.');
      return;
    }
    throw new Error('Use create or cleanup.');
  } catch {
    console.error('Staging Stripe TEST webhook operation failed safely.');
    process.exitCode = 1;
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) await main();
