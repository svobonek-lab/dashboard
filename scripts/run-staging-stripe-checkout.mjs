import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const ALLOWED_ENV = [
  'STAGING_SUPABASE_URL', 'STAGING_SUPABASE_PROJECT_REF', 'PRODUCTION_SUPABASE_PROJECT_REF',
  'STAGING_PREVIEW_URL', 'PRODUCTION_BASE_URL', 'STAGING_COMPANY_A_ID',
  'STAGING_OWNER_A_EMAIL', 'STAGING_OWNER_A_PASSWORD', 'STAGING_SUPABASE_PUBLISHABLE_KEY',
  'STAGING_SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_BILLING_MODE',
  'STRIPE_PRICE_STARTER_ID', 'PUBLIC_APP_URL', 'STAGING_BILLING_ARTIFACT_DIR',
];

export function createScopedBillingSetupEnv(source) {
  return Object.fromEntries(ALLOWED_ENV
    .filter((name) => typeof source[name] === 'string')
    .map((name) => [name, source[name]]));
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const scopedEnv = createScopedBillingSetupEnv(process.env);
  const result = spawnSync(process.execPath, ['scripts/prepare-staging-stripe-checkout.mjs'], {
    cwd: process.cwd(),
    env: scopedEnv,
    stdio: 'inherit',
  });

  if (result.error) {
    console.error('Staging Checkout setup process could not start.');
    process.exitCode = 1;
  } else {
    process.exitCode = result.status ?? 1;
  }
}
