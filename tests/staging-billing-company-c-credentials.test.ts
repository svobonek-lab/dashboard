import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';

import {
  assertBillingCompanyCCredentialsBranch,
  loadBillingCompanyCCredentials,
  prepareBillingCompanyCCredentials,
} from '../scripts/staging-billing-company-c-credentials.mjs';

test('company C credentials are high-entropy synthetic data in the run temp artifact only', async () => {
  const temp = await mkdtemp(path.join(os.tmpdir(), 'stavbaflow-billing-c-'));
  const file = path.join(temp, 'artifact', 'credentials.json');
  const githubEnv = path.join(temp, 'github-env');
  const env = {
    GITHUB_REPOSITORY: 'svobonek-lab/dashboard',
    GITHUB_REF: 'refs/heads/codex/billing-blocked-to-granted',
    RUNNER_TEMP: temp,
    STAGING_BILLING_CREDENTIALS_FILE: file,
    GITHUB_ENV: githubEnv,
  };
  try {
    const maskCommands: string[] = [];
    const writeMask = (value: string) => { maskCommands.push(value); return true; };
    const result = await prepareBillingCompanyCCredentials(env, writeMask);
    const credentials = JSON.parse(await readFile(file, 'utf8')) as { email: string; password: string };
    assert.equal(result.ownerEmail, 'billing-owner-c@stavbaflow.example.test');
    assert.equal(credentials.email, result.ownerEmail);
    assert.match(credentials.password, /^[A-Za-z0-9_-]{40,}$/);
    assert.deepEqual(maskCommands, [`::add-mask::${credentials.password}\n`]);
    assert.match(await readFile(githubEnv, 'utf8'), new RegExp(`^STAGING_OWNER_C_PASSWORD=${credentials.password}$`, 'm'));
    await rm(githubEnv, { force: true });
    await loadBillingCompanyCCredentials(env, writeMask);
    assert.deepEqual(maskCommands, [`::add-mask::${credentials.password}\n`, `::add-mask::${credentials.password}\n`]);
    assert.match(await readFile(githubEnv, 'utf8'), new RegExp(`^STAGING_OWNER_C_PASSWORD=${credentials.password}$`, 'm'));
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});

test('company C credentials refuse another branch and paths outside the run temp directory', async () => {
  assert.throws(() => assertBillingCompanyCCredentialsBranch('other/repo', 'refs/heads/codex/billing-blocked-to-granted'), /approved staging billing branch/i);
  assert.throws(() => assertBillingCompanyCCredentialsBranch('svobonek-lab/dashboard', 'refs/heads/main'), /approved staging billing branch/i);
  const temp = await mkdtemp(path.join(os.tmpdir(), 'stavbaflow-billing-c-path-'));
  try {
    await assert.rejects(prepareBillingCompanyCCredentials({
      GITHUB_REPOSITORY: 'svobonek-lab/dashboard',
      GITHUB_REF: 'refs/heads/codex/billing-blocked-to-granted',
      RUNNER_TEMP: temp,
      STAGING_BILLING_CREDENTIALS_FILE: path.join(temp, '..', 'outside.json'),
      GITHUB_ENV: path.join(temp, 'github-env'),
    }), /outside this run temporary directory/i);
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
});
