import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPreviewVariables, validateStagingPreviewConfig } from '../scripts/configure-staging-preview-env.mjs';

const valid = {
  GITHUB_REF: 'refs/heads/codex/staging-e2e-local-runner',
  STAGING_PREVIEW_GIT_BRANCH: 'codex/staging-e2e-local-runner',
  STAGING_SUPABASE_URL: 'https://xwzweltjvreqhjpbjrxa.supabase.co',
  STAGING_SUPABASE_PROJECT_REF: 'xwzweltjvreqhjpbjrxa',
  PRODUCTION_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv',
  STAGING_SUPABASE_PUBLISHABLE_KEY: 'synthetic-publishable-key',
  STAGING_SUPABASE_SERVICE_ROLE_KEY: 'synthetic-service-role-key',
  VERCEL_ORG_ID: 'team_example',
  VERCEL_PROJECT_ID: 'prj_example',
  VERCEL_TOKEN: 'synthetic-vercel-token',
};

test('staging Preview configuration accepts only the approved staging project and branch', () => {
  assert.deepEqual(validateStagingPreviewConfig(valid), []);
});

test('staging Preview configuration refuses any other branch', () => {
  assert.ok(validateStagingPreviewConfig({ ...valid, GITHUB_REF: 'refs/heads/main' }).some((error) => error.includes('approved staging branch')));
});

test('staging Preview configuration refuses production URL or project identity', () => {
  assert.ok(validateStagingPreviewConfig({ ...valid, STAGING_SUPABASE_URL: 'https://oncmtmrhmjlerbwkrecv.supabase.co' }).some((error) => error.includes('approved staging project URL')));
  assert.ok(validateStagingPreviewConfig({ ...valid, STAGING_SUPABASE_PROJECT_REF: 'oncmtmrhmjlerbwkrecv' }).some((error) => error.includes('approved refs')));
});

test('staging Preview configuration requires the staging credentials and Vercel identity', () => {
  const invalid = { ...valid, STAGING_SUPABASE_SERVICE_ROLE_KEY: '', VERCEL_TOKEN: '' };
  const errors = validateStagingPreviewConfig(invalid);
  assert.ok(errors.some((error) => error.includes('STAGING_SUPABASE_SERVICE_ROLE_KEY')));
  assert.ok(errors.some((error) => error.includes('VERCEL_TOKEN')));
});

test('preview variable plan scopes all six values to Preview on the approved branch as secrets', () => {
  const variables = buildPreviewVariables(valid, () => Buffer.alloc(32, 7));
  assert.equal(variables.length, 6);
  assert.ok(variables.every((item) => item.type === 'sensitive'));
  assert.ok(variables.every((item) => item.target.length === 1 && item.target[0] === 'preview'));
  assert.ok(variables.every((item) => item.gitBranch === 'codex/staging-e2e-local-runner'));
  assert.equal(variables.find((item) => item.key === 'VITE_SUPABASE_URL').value, valid.STAGING_SUPABASE_URL);
  assert.equal(variables.find((item) => item.key === 'SUPABASE_SERVICE_ROLE_KEY').value, valid.STAGING_SUPABASE_SERVICE_ROLE_KEY);
});

test('branch env API creates only missing exact-branch variables and does not overwrite existing entries', async () => {
  const calls = [];
  const response = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
  const fetchImpl: typeof fetch = async (url, init) => {
    calls.push({ url: String(url), init: init ?? {} });
    if (!init.method || init.method === 'GET') {
      return response(200, [{ key: 'VITE_SUPABASE_URL', gitBranch: 'codex/staging-e2e-local-runner', target: ['preview'] }]);
    }
    return response(201, { created: { key: 'created' }, failed: [] });
  };
  const { createMissingPreviewVariables } = await import('../scripts/configure-staging-preview-env.mjs');
  const result = await createMissingPreviewVariables(valid, fetchImpl, () => Buffer.alloc(32, 7));
  assert.equal(calls.length, 2);
  assert.match(calls[0].url, /gitBranch=codex%2Fstaging-e2e-local-runner/);
  assert.equal(calls[1].init.method, 'POST');
  const payload = JSON.parse(calls[1].init.body);
  assert.equal(payload.length, 5);
  assert.ok(payload.every((item) => item.key !== 'VITE_SUPABASE_URL'));
  assert.equal(result.created, 5);
  assert.equal(result.kept, 1);
});

test('branch env API fails closed when Vercel returns an API error', async () => {
  const { createMissingPreviewVariables } = await import('../scripts/configure-staging-preview-env.mjs');
  const fetchImpl: typeof fetch = async () => new Response(JSON.stringify({ error: { code: 'forbidden', message: 'no access' } }), { status: 403 });
  await assert.rejects(createMissingPreviewVariables(valid, fetchImpl), /Vercel environment request failed \(HTTP 403\)/);
});

test('branch env API fails when Vercel reports rejected variables in an otherwise successful response', async () => {
  let callCount = 0;
  const fetchImpl: typeof fetch = async () => {
    callCount += 1;
    return callCount === 1
      ? new Response(JSON.stringify([]), { status: 200 })
      : new Response(JSON.stringify({ failed: [{ error: { code: 'forbidden' } }] }), { status: 201 });
  };
  const { createMissingPreviewVariables } = await import('../scripts/configure-staging-preview-env.mjs');
  await assert.rejects(createMissingPreviewVariables(valid, fetchImpl), /Vercel rejected 1 branch-scoped environment variable/);
});
