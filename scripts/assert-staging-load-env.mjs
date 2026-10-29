import { validateK6StagingEnvironment } from '../load/validate-staging.js';
import { assertPreviewSupabaseTarget } from './assert-preview-supabase-target.mjs';

export async function assertStagingLoadEnvironment(environment = process.env, fetchImpl = fetch) {
  const target = validateK6StagingEnvironment(environment);
  if (!environment.STAGING_SUPABASE_SERVICE_ROLE_KEY || !environment.STAGING_SUPABASE_PUBLISHABLE_KEY) {
    throw new Error('Missing staging-only load fixture credentials.');
  }
  const bypass = environment.STAGING_PREVIEW_BYPASS_TOKEN;
  const guardedFetch = (url, options = {}) => fetchImpl(url, {
    ...options,
    headers: { ...options.headers, ...(bypass ? { 'x-vercel-protection-bypass': bypass } : {}) },
  });
  await assertPreviewSupabaseTarget(
    target.previewUrl,
    environment.STAGING_SUPABASE_PROJECT_REF,
    environment.PRODUCTION_SUPABASE_PROJECT_REF,
    guardedFetch,
  );
  return target;
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/assert-staging-load-env.mjs')) {
  assertStagingLoadEnvironment().then(() => {
    console.log('Staging load target and Preview bundle verified.');
  }).catch((error) => {
    console.error(error instanceof Error ? error.message : 'Staging load preflight failed.');
    process.exitCode = 1;
  });
}
