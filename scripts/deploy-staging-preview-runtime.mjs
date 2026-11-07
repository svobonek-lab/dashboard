import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import Stripe from 'stripe';

import { findVercelCli } from './run-vercel-build.mjs';
import { extractVercelPreviewUrl } from './extract-vercel-preview-url.mjs';
import { createStagingWebhookEndpoint, markStagingWebhookEndpointAliased, markStagingWebhookEndpointMayServe } from './staging-stripe-webhook.mjs';

const REPOSITORY = 'svobonek-lab/dashboard';
const BRANCH = 'codex/billing-blocked-to-granted';
const STAGING_REF = 'xwzweltjvreqhjpbjrxa';
const STAGING_ALIAS = 'dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app';

function required(env, key) {
  const value = String(env[key] || '').trim();
  if (!value) throw new Error(`Required staging Preview value is missing: ${key}.`);
  if (/[\r\n\0]/.test(value)) throw new Error(`Invalid staging Preview value: ${key}.`);
  return value;
}

export function buildStagingPreviewRuntimeArgs(env) {
  if (env.GITHUB_REPOSITORY !== REPOSITORY || env.GITHUB_REF !== `refs/heads/${BRANCH}`) {
    throw new Error('Refusing to deploy billing runtime values outside the approved repository branch.');
  }
  const supabaseUrl = required(env, 'STAGING_SUPABASE_URL');
  let supabase;
  try { supabase = new URL(supabaseUrl); } catch { throw new Error('Staging Supabase URL is invalid.'); }
  if (supabase.protocol !== 'https:' || supabase.hostname !== `${STAGING_REF}.supabase.co`) {
    throw new Error('Staging Supabase URL must point to StavbaCore Staging.');
  }
  const previewUrl = required(env, 'STAGING_PREVIEW_URL');
  const productionUrl = required(env, 'PRODUCTION_BASE_URL');
  const billingReturnUrl = required(env, 'BILLING_RETURN_URL');
  let preview;
  let production;
  let billingReturn;
  try {
    preview = new URL(previewUrl);
    production = new URL(productionUrl);
    billingReturn = new URL(billingReturnUrl);
  } catch { throw new Error('Billing return or deployment URL is invalid.'); }
  if (preview.protocol !== 'https:' || preview.hostname !== STAGING_ALIAS ||
      production.origin === preview.origin || billingReturn.origin !== preview.origin) {
    throw new Error('Billing return URL must remain on the isolated staging Preview.');
  }
  if (required(env, 'STRIPE_BILLING_MODE') !== 'test' ||
      !/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(required(env, 'STAGING_STRIPE_SECRET_KEY'))) {
    throw new Error('Refusing to deploy Stripe credentials outside TEST mode.');
  }
  const starterPrice = required(env, 'STRIPE_PRICE_STARTER_ID');
  if (!/^price_[A-Za-z0-9]+$/.test(starterPrice)) throw new Error('Starter Stripe TEST price ID is invalid.');
  const webhookSecret = required(env, 'STAGING_STRIPE_WEBHOOK_SECRET');
  if (!/^whsec_[A-Za-z0-9]+$/.test(webhookSecret)) throw new Error('Staging Stripe webhook signing secret is invalid.');

  const runtimeVariables = [
    ['SUPABASE_URL', supabaseUrl],
    ['SUPABASE_ANON_KEY', required(env, 'STAGING_SUPABASE_PUBLISHABLE_KEY')],
    ['SUPABASE_SERVICE_ROLE_KEY', required(env, 'STAGING_SUPABASE_SERVICE_ROLE_KEY')],
    ['STRIPE_SECRET_KEY', env.STAGING_STRIPE_SECRET_KEY],
    ['STRIPE_BILLING_MODE', env.STRIPE_BILLING_MODE],
    ['STRIPE_PRICE_STARTER_ID', starterPrice],
    ['STRIPE_WEBHOOK_SECRET', webhookSecret],
    ['BILLING_RETURN_URL', billingReturn.origin],
  ];
  const pilotPrice = String(env.STRIPE_PRICE_PILOT_ID || '').trim();
  if (pilotPrice) {
    if (!/^price_[A-Za-z0-9]+$/.test(pilotPrice)) throw new Error('Pilot Stripe TEST price ID is invalid.');
    runtimeVariables.push(['STRIPE_PRICE_PILOT_ID', pilotPrice]);
  }
  return runtimeVariables.flatMap(([key, value]) => ['--env', `${key}=${value}`]);
}

function runVercel(cliPath, args, env) {
  const runtimeEnvironment = Object.fromEntries([
    'PATH', 'PATHEXT', 'SYSTEMROOT', 'WINDIR', 'COMSPEC', 'TEMP', 'TMP', 'USERPROFILE', 'HOME',
    'APPDATA', 'LOCALAPPDATA', 'CI', 'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID', 'VERCEL_TOKEN',
  ].filter((key) => env[key] !== undefined).map((key) => [key, env[key]]));
  const result = spawnSync(process.execPath, [cliPath, ...args], {
    cwd: process.cwd(),
    env: runtimeEnvironment,
    encoding: 'utf8',
    windowsHide: true,
    maxBuffer: 8 * 1024 * 1024,
  });
  if (result.error || result.status !== 0) throw new Error('Vercel staging Preview operation failed.');
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

async function deploy() {
  const env = process.env;
  const webhook = await createStagingWebhookEndpoint(new Stripe(required(env, 'STAGING_STRIPE_SECRET_KEY')), env);
  if (env.GITHUB_ACTIONS === 'true') process.stdout.write(`::add-mask::${webhook.secret}\n`);
  const runtimeArgs = buildStagingPreviewRuntimeArgs({
    ...env,
    STAGING_STRIPE_WEBHOOK_SECRET: webhook.secret,
  });
  const cliPath = findVercelCli();
  const deploymentOutput = runVercel(cliPath, [
    'deploy', '--prebuilt', '--environment=preview', '--yes', `--token=${required(env, 'VERCEL_TOKEN')}`,
    '--meta', 'githubCommitRef=codex/billing-blocked-to-granted',
    '--meta', `githubCommitSha=${required(env, 'GITHUB_SHA')}`,
    ...runtimeArgs,
  ], env);
  const deploymentUrl = extractVercelPreviewUrl(deploymentOutput);
  if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(deploymentUrl)) throw new Error('Vercel returned an invalid Preview deployment URL.');
  await markStagingWebhookEndpointMayServe(env);
  runVercel(cliPath, [
    'alias', 'set', deploymentUrl, STAGING_ALIAS, `--token=${required(env, 'VERCEL_TOKEN')}`,
  ], env);
  await markStagingWebhookEndpointAliased(env);
  console.log('Staging Preview deployed with isolated StavbaCore and Stripe TEST runtime configuration.');
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await deploy();
  } catch (error) {
    console.error(JSON.stringify({
      code: 'STAGING_PREVIEW_RUNTIME_DEPLOY_FAILED',
      message: error instanceof Error ? error.message : 'Staging Preview deployment failed.',
    }));
    process.exitCode = 1;
  }
}
