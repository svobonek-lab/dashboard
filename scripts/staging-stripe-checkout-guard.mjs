const REQUIRED = [
  'STAGING_SUPABASE_URL', 'STAGING_SUPABASE_PROJECT_REF', 'PRODUCTION_SUPABASE_PROJECT_REF',
  'STAGING_PREVIEW_URL', 'PRODUCTION_BASE_URL', 'STAGING_COMPANY_A_ID',
  'STAGING_OWNER_A_EMAIL', 'STAGING_OWNER_A_PASSWORD', 'STAGING_SUPABASE_PUBLISHABLE_KEY',
  'STAGING_SUPABASE_SERVICE_ROLE_KEY', 'STRIPE_SECRET_KEY', 'STRIPE_BILLING_MODE',
  'STRIPE_PRICE_STARTER_ID', 'PUBLIC_APP_URL', 'STAGING_BILLING_ARTIFACT_DIR',
];
export const APPROVED_STAGING_PREVIEW_ORIGIN = 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app';

export function validateStagingBillingSetup(env) {
  const missing = REQUIRED.filter((key) => !String(env[key] || '').trim());
  if (missing.length) throw new Error(`Missing required staging billing configuration: ${missing.join(', ')}`);

  if (env.STAGING_SUPABASE_PROJECT_REF !== 'xwzweltjvreqhjpbjrxa' ||
      env.STAGING_SUPABASE_PROJECT_REF === env.PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new Error('Refusing billing setup: target is production or is not the approved isolated staging project.');
  }
  const supabaseUrl = new URL(env.STAGING_SUPABASE_URL);
  if (supabaseUrl.protocol !== 'https:' || supabaseUrl.hostname !== `${env.STAGING_SUPABASE_PROJECT_REF}.supabase.co` ||
      supabaseUrl.href !== `${supabaseUrl.origin}/`) {
    throw new Error('Refusing billing setup: staging Supabase URL does not match the approved staging ref.');
  }

  const preview = new URL(env.STAGING_PREVIEW_URL);
  const production = new URL(env.PRODUCTION_BASE_URL);
  if (preview.protocol !== 'https:' || preview.origin !== APPROVED_STAGING_PREVIEW_ORIGIN ||
      preview.origin === production.origin || preview.pathname !== '/' || preview.search || preview.hash) {
    throw new Error('Refusing billing setup: Preview target is not an isolated Vercel staging URL.');
  }
  const publicAppUrl = new URL(env.PUBLIC_APP_URL);
  if (publicAppUrl.protocol !== 'https:' || publicAppUrl.hostname.toLowerCase().endsWith('.vercel.app') ||
      publicAppUrl.origin === production.origin || publicAppUrl.pathname !== '/' || publicAppUrl.search || publicAppUrl.hash) {
    throw new Error('Refusing billing setup: PUBLIC_APP_URL must be a non-production custom HTTPS origin.');
  }

  if (env.STRIPE_BILLING_MODE !== 'test' || !/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY)) {
    throw new Error('Refusing billing setup: Stripe must use a TEST secret key and TEST billing mode.');
  }
  if (!/^price_[A-Za-z0-9]+$/.test(env.STRIPE_PRICE_STARTER_ID)) {
    throw new Error('Refusing billing setup: Starter TEST price ID is invalid.');
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.STAGING_SUPABASE_PUBLISHABLE_KEY)) {
    throw new Error('Refusing billing setup: staging publishable key is invalid.');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(env.STAGING_COMPANY_A_ID)) {
    throw new Error('Refusing billing setup: synthetic company A ID is invalid.');
  }
  if (String(env.STAGING_OWNER_A_EMAIL).trim().toLowerCase() !== 'owner-a@stavbaflow.example.test') {
    throw new Error('Refusing billing setup: owner email is not the synthetic company A fixture account.');
  }
  return { projectRef: env.STAGING_SUPABASE_PROJECT_REF, previewOrigin: preview.origin, publicAppOrigin: publicAppUrl.origin };
}

export function assertSyntheticCompanyA(company, expectedId) {
  if (!company || company.id !== expectedId) throw new Error('Refusing billing setup: company A ID does not match the configured synthetic company A.');
  if (company.slug !== 'e2e-synthetic-company-a') throw new Error('Refusing billing setup: target company is not the synthetic company A.');
}

export function formatSafeBillingSetupLog({ projectRef, companySlug, customerId, testClockId, checkoutUrl, accessToken }) {
  const safe = { projectRef, companySlug, customerId, testClockId };
  return JSON.stringify(Object.fromEntries(Object.entries(safe).filter(([, value]) => typeof value === 'string' && value.length > 0)));
}
