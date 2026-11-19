import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { validateStagingPreview } from './validate-staging-preview.mjs';

const branch = 'codex/lead-notes-files-acceptance';

export async function assertLeadAttachmentsPreviewProvenance(env, fetchImpl = fetch) {
  const preview = validateStagingPreview(env.STAGING_PREVIEW_URL, env.PRODUCTION_BASE_URL);
  if (!env.VERCEL_ORG_ID || !env.VERCEL_PROJECT_ID || !env.VERCEL_TOKEN || !/^[0-9a-f]{40}$/i.test(String(env.GITHUB_SHA || ''))) {
    throw new Error('Preview provenance configuration is incomplete.');
  }
  const hostname = new URL(preview).hostname;
  const url = `https://api.vercel.com/v13/deployments/${encodeURIComponent(hostname)}?teamId=${encodeURIComponent(env.VERCEL_ORG_ID)}`;
  const response = await fetchImpl(url, {
    headers: { Authorization: `Bearer ${env.VERCEL_TOKEN}` },
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Preview provenance lookup failed (HTTP ${response.status}).`);
  const deployment = await response.json();
  if (deployment.projectId !== env.VERCEL_PROJECT_ID || deployment.readyState !== 'READY' ||
      deployment.target === 'production' || deployment.meta?.githubCommitRef !== branch ||
      deployment.meta?.githubCommitSha !== env.GITHUB_SHA ||
      deployment.meta?.githubCommitOrg !== 'svobonek-lab' || deployment.meta?.githubCommitRepo !== 'dashboard') {
    throw new Error('Preview provenance does not match the reviewed project, branch and commit.');
  }
  return { deploymentId: deployment.id, commitSha: env.GITHUB_SHA, preview };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await assertLeadAttachmentsPreviewProvenance(process.env);
    console.log(`Preview provenance verified: ${result.deploymentId}, ${result.commitSha}.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Preview provenance check failed.');
    process.exitCode = 1;
  }
}
