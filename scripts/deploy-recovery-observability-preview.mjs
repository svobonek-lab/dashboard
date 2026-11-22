import { spawnSync } from 'node:child_process';
import { assertPreviewSupabaseTarget } from './assert-preview-supabase-target.mjs';
import { extractVercelPreviewUrl } from './extract-vercel-preview-url.mjs';

const env = process.env;
const branch = 'codex/staging-recovery-and-alert-evidence';
const staging = 'xwzweltjvreqhjpbjrxa';
const stageUrl = `https://${staging}.supabase.co`;
const disabled = 'disabled-for-staging-observability-drill';
if (env.GITHUB_REPOSITORY !== 'svobonek-lab/dashboard' || env.GITHUB_REF !== `refs/heads/${branch}`
    || !/^[0-9a-f]{40}$/.test(env.GITHUB_SHA || '') || !env.VERCEL_TOKEN || !env.VERCEL_PROJECT_ID || !env.VERCEL_ORG_ID
    || !env.STAGING_SUPABASE_PUBLISHABLE_KEY || !env.STAGING_SENTRY_DSN) {
  throw new Error('Isolated observability Preview inputs are missing or invalid');
}
const dsn = new URL(env.STAGING_SENTRY_DSN);
if (dsn.protocol !== 'https:' || !dsn.hostname.endsWith('.sentry.io')) throw new Error('Expected a staging Sentry DSN');
const args = ['--yes', 'vercel@65.8.0', 'deploy', '--yes', '--target', 'preview', '--token', env.VERCEL_TOKEN,
  '--meta', `githubCommitRef=${branch}`, '--meta', `githubCommitSha=${env.GITHUB_SHA}`,
  '--meta', 'githubCommitOrg=svobonek-lab', '--meta', 'githubCommitRepo=dashboard'];
const build = {
  VITE_SUPABASE_URL: stageUrl, VITE_SUPABASE_ANON_KEY: env.STAGING_SUPABASE_PUBLISHABLE_KEY,
  VITE_DEPLOYMENT_SURFACE: 'app', VITE_SENTRY_DSN: env.STAGING_SENTRY_DSN, VITE_SENTRY_ENVIRONMENT: 'staging',
  VITE_PILOT_WRITES: 'false', VITE_APP_LEAD_WRITES: 'false',
};
const runtime = {
  SUPABASE_URL: stageUrl, SUPABASE_ANON_KEY: env.STAGING_SUPABASE_PUBLISHABLE_KEY,
  SUPABASE_SERVICE_ROLE_KEY: disabled, RESEND_API_KEY: disabled, STRIPE_SECRET_KEY: disabled,
  APP_IMPORT_WORKER_ENABLED: 'false', APP_INVITE_WORKER_ENABLED: 'false', APP_AUTH_RECOVERY_ENABLED: 'false',
};
for (const [name, value] of Object.entries(build)) args.push('--build-env', `${name}=${value}`);
for (const [name, value] of Object.entries(runtime)) args.push('--env', `${name}=${value}`);
const deploy = spawnSync('npx', args, { encoding: 'utf8', maxBuffer: 8 * 1024 * 1024 });
if (deploy.status !== 0) throw new Error('Vercel observability Preview build failed');
const preview = extractVercelPreviewUrl(`${deploy.stdout}\n${deploy.stderr}`);
const response = await fetch(`https://api.vercel.com/v13/deployments/${new URL(preview).hostname}?teamId=${encodeURIComponent(env.VERCEL_ORG_ID)}`, {
  headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` }, signal: AbortSignal.timeout(20_000),
});
if (!response.ok) throw new Error(`Preview provenance failed (${response.status})`);
const deployment = await response.json();
if (deployment.projectId !== env.VERCEL_PROJECT_ID || deployment.target === 'production' || deployment.readyState !== 'READY'
  || deployment.meta?.githubCommitSha !== env.GITHUB_SHA || deployment.meta?.githubCommitRef !== branch) {
  throw new Error('Preview provenance mismatch');
}
await assertPreviewSupabaseTarget(preview, staging, 'oncmtmrhmjlerbwkrecv');
console.log(JSON.stringify({ preview, deploymentId: deployment.id, candidate: env.GITHUB_SHA,
  stagingProject: staging, sentryProjectId: dsn.pathname.split('/').filter(Boolean).at(-1) }));
