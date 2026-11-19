import assert from 'node:assert/strict';
import test from 'node:test';
import { assertLeadAttachmentsPreviewProvenance } from '../scripts/assert-lead-attachments-preview-provenance.mjs';

const env = {
  STAGING_PREVIEW_URL: 'https://dashboard-example-svobonek-6462s-projects.vercel.app',
  PRODUCTION_BASE_URL: 'https://dashboard-svobonek-6462s-projects.vercel.app',
  VERCEL_ORG_ID: 'team_synthetic',
  VERCEL_PROJECT_ID: 'prj_synthetic',
  VERCEL_TOKEN: 'synthetic-token',
  GITHUB_SHA: 'a'.repeat(40),
};
const deployment = {
  projectId: env.VERCEL_PROJECT_ID,
  readyState: 'READY',
  target: null,
  meta: {
    githubCommitRef: 'codex/lead-notes-files-acceptance',
    githubCommitSha: env.GITHUB_SHA,
    githubCommitOrg: 'svobonek-lab',
    githubCommitRepo: 'dashboard',
  },
};

test('Preview provenance requires the exact reviewed Git branch and SHA', async () => {
  const calls: string[] = [];
  const fetchImpl: typeof fetch = async input => {
    calls.push(String(input));
    return new Response(JSON.stringify(deployment), { status: 200 });
  };
  await assertLeadAttachmentsPreviewProvenance(env, fetchImpl);
  assert.match(calls[0], /\/v13\/deployments\/dashboard-example-svobonek-6462s-projects\.vercel\.app/);
});

test('wrong commit, branch, project or Production target fails closed', async () => {
  for (const changed of [
    { meta: { ...deployment.meta, githubCommitSha: 'b'.repeat(40) } },
    { meta: { ...deployment.meta, githubCommitRef: 'main' } },
    { projectId: 'prj_other' },
    { target: 'production' },
  ]) {
    const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ ...deployment, ...changed }), { status: 200 });
    await assert.rejects(assertLeadAttachmentsPreviewProvenance(env, fetchImpl), /Preview provenance/);
  }
});
