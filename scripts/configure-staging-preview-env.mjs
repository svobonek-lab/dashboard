import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const allowedBranch = 'codex/staging-e2e-local-runner';
const allowedStagingRef = 'xwzweltjvreqhjpbjrxa';
const allowedProductionRef = 'oncmtmrhmjlerbwkrecv';

export function validateStagingPreviewConfig(env) {
  const errors = [];
  if (env.GITHUB_REF !== `refs/heads/${allowedBranch}` || env.STAGING_PREVIEW_GIT_BRANCH !== allowedBranch) {
    errors.push('Preview configuration is allowed only on the explicitly approved staging branch.');
  }
  if (env.STAGING_SUPABASE_PROJECT_REF !== allowedStagingRef || env.PRODUCTION_SUPABASE_PROJECT_REF !== allowedProductionRef) {
    errors.push('Staging and production project identities do not match the approved refs.');
  }
  try {
    const url = new URL(env.STAGING_SUPABASE_URL);
    if (url.protocol !== 'https:' || url.hostname !== `${allowedStagingRef}.supabase.co`) {
      errors.push('The configured Supabase URL is not the approved staging project URL.');
    }
  } catch {
    errors.push('The staging Supabase URL is invalid.');
  }
  for (const name of [
    'STAGING_SUPABASE_PUBLISHABLE_KEY', 'STAGING_SUPABASE_SERVICE_ROLE_KEY',
    'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID', 'VERCEL_TOKEN',
  ]) {
    if (!env[name]) errors.push(`Required configuration is missing: ${name}.`);
  }
  return errors;
}

export function buildPreviewVariables(env, randomBytesImpl = randomBytes) {
  return [
    ['VITE_SUPABASE_URL', env.STAGING_SUPABASE_URL],
    ['VITE_SUPABASE_ANON_KEY', env.STAGING_SUPABASE_PUBLISHABLE_KEY],
    ['SUPABASE_URL', env.STAGING_SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', env.STAGING_SUPABASE_SERVICE_ROLE_KEY],
    ['CONNECTOR_SECRET_ENCRYPTION_KEY', randomBytesImpl(32).toString('base64')],
    ['INTAKE_HASH_SECRET', randomBytesImpl(32).toString('base64url')],
  ].map(([key, value]) => ({
    key,
    value,
    type: 'sensitive',
    target: ['preview'],
    gitBranch: allowedBranch,
    comment: 'Staging-only Preview for synthetic acceptance tests',
  }));
}

async function vercelApi(url, env, fetchImpl, init) {
  const response = await fetchImpl(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${env.VERCEL_TOKEN}`,
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
    signal: AbortSignal.timeout(30_000),
  });
  let body;
  try { body = await response.json(); } catch { body = null; }
  if (!response.ok) throw new Error(`Vercel environment request failed (HTTP ${response.status}).`);
  if (Array.isArray(body?.failed) && body.failed.length > 0) {
    throw new Error(`Vercel rejected ${body.failed.length} branch-scoped environment variable${body.failed.length === 1 ? '' : 's'}.`);
  }
  return body;
}

export async function createMissingPreviewVariables(env, fetchImpl = fetch, randomBytesImpl = randomBytes) {
  const baseUrl = `https://api.vercel.com/v10/projects/${encodeURIComponent(env.VERCEL_PROJECT_ID)}/env`;
  const query = new URLSearchParams({ gitBranch: allowedBranch, teamId: env.VERCEL_ORG_ID, decrypt: 'false' });
  const inventory = await vercelApi(`${baseUrl}?${query}`, env, fetchImpl);
  if (!Array.isArray(inventory)) {
    throw new Error('Vercel environment inventory response was invalid.');
  }

  const existingNames = new Set(inventory
    .filter((item) => item.gitBranch === allowedBranch && Array.isArray(item.target) && item.target.includes('preview'))
    .map((item) => item.key));
  const missing = buildPreviewVariables(env, randomBytesImpl).filter((item) => !existingNames.has(item.key));
  if (missing.length) {
    await vercelApi(`${baseUrl}?teamId=${encodeURIComponent(env.VERCEL_ORG_ID)}`, env, fetchImpl, {
      method: 'POST',
      body: JSON.stringify(missing),
    });
  }
  const requestedNames = new Set(buildPreviewVariables(env, () => Buffer.alloc(32)).map((item) => item.key));
  const kept = [...existingNames].filter((name) => requestedNames.has(name)).length;
  return { created: missing.length, kept };
}

async function main() {
  const errors = validateStagingPreviewConfig(process.env);
  if (errors.length) throw new Error(errors.join(' '));

  const result = await createMissingPreviewVariables(process.env);
  console.log(`Created ${result.created} missing sensitive Preview variables; kept ${result.kept} existing variables for ${allowedBranch}.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    await main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Staging Preview configuration failed.');
    process.exitCode = 1;
  }
}
