const REQUIRED = [
  'STAGING_SUPABASE_URL', 'STAGING_SUPABASE_PROJECT_REF', 'PRODUCTION_SUPABASE_PROJECT_REF',
  'STAGING_PREVIEW_URL', 'PRODUCTION_BASE_URL', 'STAGING_COMPANY_A_ID',
  'STAGING_OWNER_A_EMAIL', 'STAGING_OWNER_A_PASSWORD', 'STAGING_SUPABASE_PUBLISHABLE_KEY',
  'STRIPE_SECRET_KEY', 'STRIPE_BILLING_MODE',
];

export const APPROVED_STAGING_REF = 'xwzweltjvreqhjpbjrxa';
export const APPROVED_STAGING_PREVIEW_ORIGIN = 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app';

export function isPortalDocumentReady(state) {
  return state?.readyState === 'complete' && Number(state.bodyTextLength) > 0 &&
    state.bodyDisplay !== 'none' && state.bodyVisibility === 'visible' && Number(state.bodyOpacity) > 0;
}

export function getPortalCancellationSettings(configuration) {
  const feature = configuration?.features?.subscription_cancel;
  return {
    enabled: feature?.enabled === true,
    mode: typeof feature?.mode === 'string' ? feature.mode : null,
  };
}

export function summarizePortalFrames(states) {
  const frames = Array.isArray(states) ? states.filter(Boolean) : [];
  const visibleActions = [...new Set(frames.flatMap((frame) =>
    Array.isArray(frame.visibleActions) ? frame.visibleActions : []))].slice(0, 12);
  return {
    title: frames.find((frame) => typeof frame.title === 'string' && frame.title)?.title || '',
    billingContentVisible: frames.some((frame) => frame.billingContentVisible === true),
    cancellationActionVisible: visibleActions.some((label) => /cancel|zruš|kündig|annul/i.test(label)),
    visibleActions,
    frameCount: frames.length,
    frameDiagnostics: frames.map((frame) => ({
      host: typeof frame.host === 'string' ? frame.host : 'unknown',
      bodyTextLength: Number(frame.bodyTextLength) || 0,
      hasSubscriptionWords: frame.hasSubscriptionWords === true,
      saysNoSubscription: frame.saysNoSubscription === true,
      visibleControlCount: Number(frame.visibleControlCount) || 0,
    })),
  };
}

export function validateStagingStripeLifecycle(env) {
  const missing = REQUIRED.filter((key) => !String(env[key] || '').trim());
  if (missing.length) throw new Error(`Missing staging billing lifecycle configuration: ${missing.join(', ')}`);

  if (env.STAGING_SUPABASE_PROJECT_REF !== APPROVED_STAGING_REF ||
      env.STAGING_SUPABASE_PROJECT_REF === env.PRODUCTION_SUPABASE_PROJECT_REF) {
    throw new Error('Refusing billing lifecycle: target is not the approved isolated staging project.');
  }
  const supabaseUrl = new URL(env.STAGING_SUPABASE_URL);
  if (supabaseUrl.protocol !== 'https:' || supabaseUrl.hostname !== `${APPROVED_STAGING_REF}.supabase.co` ||
      supabaseUrl.href !== `${supabaseUrl.origin}/`) {
    throw new Error('Refusing billing lifecycle: staging URL does not match the approved staging project ref.');
  }

  const previewUrl = new URL(env.STAGING_PREVIEW_URL);
  const productionUrl = new URL(env.PRODUCTION_BASE_URL);
  if (previewUrl.protocol !== 'https:' || previewUrl.origin !== APPROVED_STAGING_PREVIEW_ORIGIN ||
      previewUrl.origin === productionUrl.origin || previewUrl.pathname !== '/' || previewUrl.search || previewUrl.hash) {
    throw new Error('Refusing billing lifecycle: target is not the approved staging Preview.');
  }
  if (env.STRIPE_BILLING_MODE !== 'test' || !/^(?:sk|rk)_test_[A-Za-z0-9]+$/.test(env.STRIPE_SECRET_KEY)) {
    throw new Error('Refusing billing lifecycle: Stripe must use a TEST secret key and TEST mode.');
  }
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.STAGING_SUPABASE_PUBLISHABLE_KEY)) {
    throw new Error('Refusing billing lifecycle: staging publishable key is invalid.');
  }
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(env.STAGING_COMPANY_A_ID)) {
    throw new Error('Refusing billing lifecycle: configured company A ID is invalid.');
  }
  if (String(env.STAGING_OWNER_A_EMAIL).trim().toLowerCase() !== 'owner-a@stavbaflow.example.test') {
    throw new Error('Refusing billing lifecycle: owner identity is not the synthetic company A fixture.');
  }
  return { projectRef: APPROVED_STAGING_REF, previewOrigin: previewUrl.origin };
}

export function validateStagingStripePortalUrl(value) {
  let target;
  try {
    target = new URL(value);
  } catch {
    throw new Error('Refusing billing lifecycle: response is not a hosted billing portal URL.');
  }
  if (target.protocol !== 'https:' || target.hostname !== 'billing.stripe.com' || !target.pathname.startsWith('/p/')) {
    throw new Error('Refusing billing lifecycle: response is not a hosted billing portal URL.');
  }
  return target.toString();
}
