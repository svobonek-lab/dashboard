import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

import { parseVercelStripePreviewConfig } from './export-staging-stripe-env.mjs';

const APPROVED_BRANCH = 'refs/heads/codex/staging-e2e-local-runner';
const APPROVED_ORIGIN = 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app';

function required(env, key) {
  const value = String(env[key] || '').trim();
  if (!value) throw new Error(`Missing required configuration: ${key}`);
  return value;
}

export function getPilotStripePriceSetup(env, config) {
  if (env.GITHUB_REPOSITORY !== 'svobonek-lab/dashboard' || env.GITHUB_REF !== APPROVED_BRANCH ||
      env.VERCEL_GIT_BRANCH !== 'codex/staging-e2e-local-runner') {
    throw new Error('Refusing to configure Stripe price outside the approved staging repository branch.');
  }
  if (new URL(required(env, 'STAGING_PREVIEW_URL')).origin !== APPROVED_ORIGIN ||
      new URL(env.STAGING_PREVIEW_URL).origin === new URL(required(env, 'PRODUCTION_BASE_URL')).origin) {
    throw new Error('Refusing to configure Stripe price outside the exact staging Preview.');
  }
  if (config.STRIPE_BILLING_MODE !== 'test' || !/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(required(env, 'STAGING_STRIPE_SECRET_KEY'))) {
    throw new Error('Refusing to configure Stripe price unless the Preview is in Stripe TEST mode.');
  }
  const starterPriceId = String(config.STRIPE_PRICE_STARTER_ID || '').trim();
  if (!/^price_[A-Za-z0-9]+$/.test(starterPriceId)) throw new Error('The staging Starter TEST price ID is missing or invalid.');
  const pilotPriceId = String(config.STRIPE_PRICE_PILOT_ID || '').trim();
  const shouldReplaceExisting = Boolean(pilotPriceId) && pilotPriceId !== starterPriceId;
  return { starterPriceId, pilotPriceId, shouldAdd: !pilotPriceId || shouldReplaceExisting, shouldReplaceExisting };
}

async function main(env = process.env) {
  const parsed = parseVercelStripePreviewConfig(await readFile(required(env, 'STAGING_PREVIEW_CONFIG_FILE'), 'utf8'));
  const setup = getPilotStripePriceSetup(env, parsed);
  if (!setup.shouldAdd) {
    console.log('The staging branch pilot price already matches its Starter TEST price; no Vercel change was needed.');
    return;
  }

  if (setup.shouldReplaceExisting) {
    const removal = spawnSync('npx', [
      '--yes', 'vercel@65.8.0', 'env', 'rm', 'STRIPE_PRICE_PILOT_ID', 'preview',
      'codex/staging-e2e-local-runner', '--token', required(env, 'VERCEL_TOKEN'), '--yes',
    ], { cwd: process.cwd(), env, encoding: 'utf8', windowsHide: true });
    if (removal.error || removal.status !== 0) {
      throw new Error('Could not remove the previous branch-only pilot price; staging configuration needs review.');
    }
  }

  const result = spawnSync('npx', [
    '--yes', 'vercel@65.8.0', 'env', 'add', 'STRIPE_PRICE_PILOT_ID', 'preview',
    'codex/staging-e2e-local-runner', '--type', 'config', '--token', required(env, 'VERCEL_TOKEN'), '--yes',
  ], {
    cwd: process.cwd(),
    env,
    input: `${setup.starterPriceId}\n`,
    encoding: 'utf8',
    windowsHide: true,
  });
  if (result.error || result.status !== 0) {
    throw new Error('Vercel refused the branch-only pilot TEST price configuration; existing settings were not overwritten.');
  }
  console.log('Configured only the staging Preview branch pilot price as readable Config using its monthly Starter TEST price.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch((error) => {
    console.error(JSON.stringify({
      code: 'STAGING_PILOT_TEST_PRICE_CONFIGURATION_FAILED',
      message: error instanceof Error ? error.message : 'Could not configure the staging pilot TEST price.',
    }));
    process.exitCode = 1;
  });
}
