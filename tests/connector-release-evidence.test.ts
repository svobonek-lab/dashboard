import assert from 'node:assert/strict';
import test from 'node:test';
import { assertConnectorAcceptanceEvidence } from '../scripts/connector-release-evidence.ts';

const sha = 'a'.repeat(40);
const run = {
  workflow_id: 123,
  event: 'workflow_dispatch',
  status: 'completed',
  conclusion: 'success',
  head_branch: 'main',
  head_sha: sha,
};
const workflow = { id: 123, path: '.github/workflows/connector-staging-acceptance.yml' };

test('accepts successful staging evidence for the exact main commit', () => {
  assert.doesNotThrow(() => assertConnectorAcceptanceEvidence(run, workflow, sha));
});

test('rejects failed or incomplete acceptance runs', () => {
  assert.throws(() => assertConnectorAcceptanceEvidence({ ...run, conclusion: 'failure' }, workflow, sha), /successful/);
  assert.throws(() => assertConnectorAcceptanceEvidence({ ...run, status: 'in_progress', conclusion: null }, workflow, sha), /completed/);
});

test('rejects evidence from another workflow, branch, event, or commit', () => {
  assert.throws(() => assertConnectorAcceptanceEvidence(run, { ...workflow, path: '.github/workflows/verify.yml' }, sha), /acceptance workflow/);
  assert.throws(() => assertConnectorAcceptanceEvidence({ ...run, head_branch: 'codex/test' }, workflow, sha), /main branch/);
  assert.throws(() => assertConnectorAcceptanceEvidence({ ...run, event: 'push' }, workflow, sha), /manual dispatch/);
  assert.throws(() => assertConnectorAcceptanceEvidence({ ...run, head_sha: 'b'.repeat(40) }, workflow, sha), /exact main commit/);
});
