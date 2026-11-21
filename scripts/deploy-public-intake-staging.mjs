import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { assertPreviewSupabaseTarget } from './assert-preview-supabase-target.mjs';
import { extractVercelPreviewUrl } from './extract-vercel-preview-url.mjs';

const stage = 'xwzweltjvreqhjpbjrxa';
const production = 'oncmtmrhmjlerbwkrecv';
const stageUrl = `https://${stage}.supabase.co`;
const candidate = '53c27ac71f4db2b53251f34719ec82cbb9a1b693';
const branch = 'codex/lead-write-contract';
const env = process.env;
const disabled = 'disabled-for-public-intake-acceptance';

if (env.GITHUB_REPOSITORY !== 'svobonek-lab/dashboard'
  || env.GITHUB_REF !== 'refs/heads/codex/public-intake-acceptance'
  || env.STAGING_SUPABASE_URL?.replace(/\/$/, '') !== stageUrl
  || env.STAGING_SUPABASE_PROJECT_REF !== stage || env.PRODUCTION_SUPABASE_PROJECT_REF !== production) {
  throw new Error('Refusing to deploy outside the approved public intake staging target.');
}
for (const key of ['STAGING_SUPABASE_PUBLISHABLE_KEY', 'STAGING_SUPABASE_SERVICE_ROLE_KEY',
  'VERCEL_ORG_ID', 'VERCEL_PROJECT_ID', 'VERCEL_TOKEN', 'GITHUB_OUTPUT']) {
  if (!env[key]) throw new Error(`Missing required staging configuration: ${key}`);
}
const source = spawnSync('git', ['rev-parse', 'HEAD'], { cwd: 'candidate', encoding: 'utf8' });
if (source.status !== 0 || source.stdout.trim() !== candidate) throw new Error('Candidate checkout SHA mismatch.');

const key = env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
const check = await fetch(`${stageUrl}/rest/v1/app_companies?select=id&id=eq.3a51a21e-5b13-48d1-87e9-a5915b46d37d`, {
  headers: { apikey: key, ...(key.startsWith('sb_secret_') ? {} : { Authorization: `Bearer ${key}` }) },
  signal: AbortSignal.timeout(15_000),
});
if (!check.ok) throw new Error(`Staging service credential check failed (HTTP ${check.status}).`);
const companies = await check.json();
if (!Array.isArray(companies) || companies.length !== 1 || companies[0]?.id !== '3a51a21e-5b13-48d1-87e9-a5915b46d37d') {
  throw new Error('Staging service credential could not resolve the exact test company.');
}

const args = ['--yes', 'vercel@65.8.0', 'deploy', '--yes', '--target', 'preview',
  '--token', env.VERCEL_TOKEN, '--meta', `githubCommitRef=${branch}`, '--meta', `githubCommitSha=${candidate}`,
  '--meta', 'githubCommitOrg=svobonek-lab', '--meta', 'githubCommitRepo=dashboard'];
const build = {
  VITE_SUPABASE_URL: stageUrl, VITE_SUPABASE_ANON_KEY: env.STAGING_SUPABASE_PUBLISHABLE_KEY,
  VITE_DEPLOYMENT_SURFACE: 'app', VITE_APP_LEAD_WRITES: 'true', VITE_PRODUCTION_APP_LEAD_WRITES_APPROVED: 'false',
};
const runtime = {
  SUPABASE_URL: stageUrl, SUPABASE_ANON_KEY: env.STAGING_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: key, INTAKE_HASH_SECRET: randomBytes(32).toString('hex'),
  RESEND_API_KEY: disabled, STRIPE_SECRET_KEY: disabled, APP_IMPORT_WORKER_ENABLED: 'false',
  APP_INVITE_WORKER_ENABLED: 'false', APP_AUTH_RECOVERY_ENABLED: 'false',
};
for (const [name,value] of Object.entries(build)) args.push('--build-env', `${name}=${value}`);
for (const [name,value] of Object.entries(runtime)) args.push('--env', `${name}=${value}`);
const deploy = spawnSync('npx', args, { cwd: 'candidate', encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
if (deploy.status !== 0) throw new Error('Staging Preview deploy failed.');
const preview = extractVercelPreviewUrl(`${deploy.stdout}\n${deploy.stderr}`);
if (!/^https:\/\/[a-z0-9-]+\.vercel\.app$/.test(preview)) throw new Error('Unexpected Preview origin.');
const info = await fetch(`https://api.vercel.com/v13/deployments/${new URL(preview).hostname}?teamId=${encodeURIComponent(env.VERCEL_ORG_ID)}`, {
  headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` }, signal: AbortSignal.timeout(20_000),
});
if (!info.ok) throw new Error(`Vercel Preview provenance returned HTTP ${info.status}.`);
const deployment = await info.json();
if (deployment.projectId !== env.VERCEL_PROJECT_ID || deployment.target === 'production'
  || deployment.readyState !== 'READY' || deployment.meta?.githubCommitSha !== candidate
  || deployment.meta?.githubCommitRef !== branch) throw new Error('Staging Preview provenance mismatch.');
await assertPreviewSupabaseTarget(preview, stage, production);
appendFileSync(env.GITHUB_OUTPUT, `preview=${preview}\n`);
console.log(`Stage Preview: ${preview} ${deployment.id} ${candidate} ${stage}`);
