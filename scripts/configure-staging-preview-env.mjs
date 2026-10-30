import { randomBytes } from 'node:crypto';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
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

function runVercel(args, env, input = '') {
  const result = spawnSync('npx', ['--yes', 'vercel@59.25.4', ...args], {
    cwd: process.cwd(),
    encoding: 'utf8',
    input,
    timeout: 120_000,
    windowsHide: true,
    env: { ...process.env, VERCEL_TOKEN: env.VERCEL_TOKEN },
  });
  if (result.error || result.status !== 0) {
    throw new Error(`Vercel CLI command failed; exit=${result.status ?? 'spawn-error'}.`);
  }
  return `${result.stdout || ''}\n${result.stderr || ''}`;
}

function addPreviewSecret(name, value, env, overwrite) {
  const args = [
    '--yes', '--non-interactive', '--token', env.VERCEL_TOKEN, '--scope', env.VERCEL_ORG_ID,
    'env', 'add', name, 'preview', '--project', env.VERCEL_PROJECT_ID,
    '--git-branch', allowedBranch, '--sensitive',
  ];
  if (overwrite) args.push('--force');
  runVercel(args, env, `${value}\n`);
  console.log(`Configured sensitive Preview variable: ${name}`);
}

function main() {
  const errors = validateStagingPreviewConfig(process.env);
  if (errors.length) throw new Error(errors.join(' '));

  const environment = process.env;
  const listing = runVercel([
    '--non-interactive', '--token', environment.VERCEL_TOKEN, '--scope', environment.VERCEL_ORG_ID,
    'env', 'ls', 'preview', allowedBranch, '--project', environment.VERCEL_PROJECT_ID,
  ], environment);
  const existingNames = new Set([...listing.matchAll(/^\s+([A-Z][A-Z0-9_]+)\s+/gm)].map((match) => match[1]));
  const variables = [
    ['VITE_SUPABASE_URL', environment.STAGING_SUPABASE_URL],
    ['VITE_SUPABASE_ANON_KEY', environment.STAGING_SUPABASE_PUBLISHABLE_KEY],
    ['SUPABASE_URL', environment.STAGING_SUPABASE_URL],
    ['SUPABASE_SERVICE_ROLE_KEY', environment.STAGING_SUPABASE_SERVICE_ROLE_KEY],
    ['CONNECTOR_SECRET_ENCRYPTION_KEY', randomBytes(32).toString('base64')],
    ['INTAKE_HASH_SECRET', randomBytes(32).toString('base64url')],
  ];

  for (const [name, value] of variables) {
    if ((name === 'CONNECTOR_SECRET_ENCRYPTION_KEY' || name === 'INTAKE_HASH_SECRET') && existingNames.has(name)) {
      console.log(`Kept existing sensitive Preview variable: ${name}`);
      continue;
    }
    addPreviewSecret(name, value, environment, existingNames.has(name));
  }
  console.log(`Configured ${variables.length} sensitive variables for Preview branch ${allowedBranch}.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    main();
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Staging Preview configuration failed.');
    process.exitCode = 1;
  }
}
