import { appendFile } from 'node:fs/promises';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { APPROVED_STAGING_PREVIEW_ORIGIN } from './staging-stripe-checkout-guard.mjs';

const STRIPE_VARIABLES = ['STRIPE_SECRET_KEY', 'STRIPE_BILLING_MODE', 'STRIPE_PRICE_STARTER_ID', 'BILLING_RETURN_URL'];
const OPTIONAL_STRIPE_VARIABLES = ['STRIPE_PRICE_PILOT_ID'];

export function parseVercelStripePreviewConfig(contents) {
  const allowed = new Set(['STRIPE_BILLING_MODE', 'STRIPE_PRICE_STARTER_ID', 'STRIPE_PRICE_PILOT_ID', 'BILLING_RETURN_URL']);
  const values = {};
  for (const line of String(contents).split(/\r?\n/)) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!match || !allowed.has(match[1])) continue;
    let value = match[2];
    if (value.startsWith('"') && value.endsWith('"')) {
      try { value = JSON.parse(value); } catch { throw new Error(`Invalid Vercel Preview config value: ${match[1]}`); }
    } else if (value.startsWith("'") && value.endsWith("'")) {
      value = value.slice(1, -1).replace(/\\'/g, "'");
    } else {
      value = value.replace(/\s+#.*$/, '');
    }
    values[match[1]] = value;
  }
  return values;
}

export function buildStagingStripeEnvLines(env) {
  const required = [...STRIPE_VARIABLES, 'STAGING_PREVIEW_URL', 'PRODUCTION_BASE_URL'];
  const missing = required.filter((name) => !String(env[name] || '').trim());
  if (missing.length) throw new Error(`Missing required Stripe TEST Preview variables: ${missing.join(', ')}`);
  if (env.STRIPE_BILLING_MODE !== 'test' || !/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY)) {
    throw new Error('Refusing to export: Vercel Preview Stripe variables are not in TEST mode.');
  }
  if (!/^price_[A-Za-z0-9]+$/.test(env.STRIPE_PRICE_STARTER_ID)) {
    throw new Error('Refusing to export: Starter Stripe TEST price ID is invalid.');
  }
  const pilotPriceId = String(env.STRIPE_PRICE_PILOT_ID || '').trim();
  if (pilotPriceId && !/^price_[A-Za-z0-9]+$/.test(pilotPriceId)) {
    throw new Error('Refusing to export: Pilot Stripe TEST price ID is invalid.');
  }
  const preview = new URL(env.STAGING_PREVIEW_URL);
  const production = new URL(env.PRODUCTION_BASE_URL);
  const returnUrl = new URL(env.BILLING_RETURN_URL);
  if (preview.protocol !== 'https:' || preview.origin !== APPROVED_STAGING_PREVIEW_ORIGIN ||
      production.origin === preview.origin || returnUrl.origin !== preview.origin ||
      STRIPE_VARIABLES.some((name) => /[\r\n]/.test(env[name]))) {
    throw new Error('Refusing to export: billing URL is not isolated to the approved staging Preview.');
  }
  const variablesToExport = [
    ...STRIPE_VARIABLES,
    ...OPTIONAL_STRIPE_VARIABLES.filter((name) => String(env[name] || '').trim()),
  ];
  return variablesToExport.map((name) => `${name}=${name === 'STRIPE_PRICE_PILOT_ID' ? pilotPriceId : env[name]}`).join('\n') + '\n';
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    if (process.env.GITHUB_REPOSITORY !== 'svobonek-lab/dashboard' ||
        process.env.GITHUB_REF !== 'refs/heads/codex/staging-e2e-local-runner') {
      throw new Error('Refusing to export staging Stripe variables outside the approved repository branch.');
    }
    const target = String(process.env.GITHUB_ENV || '').trim();
    if (!target) throw new Error('GitHub Actions environment-file path is unavailable.');
    const configFile = String(process.env.STAGING_PREVIEW_CONFIG_FILE || '').trim();
    if (!configFile) throw new Error('Vercel Preview config file path is unavailable.');
    const config = parseVercelStripePreviewConfig(await readFile(configFile, 'utf8'));
    const env = { ...config, ...process.env };
    env.STRIPE_SECRET_KEY = process.env.STAGING_STRIPE_SECRET_KEY || '';
    await appendFile(target, buildStagingStripeEnvLines(env), { encoding: 'utf8', mode: 0o600 });
    process.stdout.write(`::add-mask::${env.STRIPE_SECRET_KEY}\n`);
    console.log('Approved Stripe TEST Preview variables are ready for the staging billing setup step.');
  } catch (error) {
    console.error(JSON.stringify({
      code: 'STAGING_STRIPE_ENV_EXPORT_FAILED',
      message: error instanceof Error ? error.message : 'Could not prepare Stripe TEST values.',
    }));
    process.exitCode = 1;
  }
}
