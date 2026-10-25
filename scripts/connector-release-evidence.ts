import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

interface AcceptanceRun {
  workflow_id: number;
  event: string;
  status: string;
  conclusion: string | null;
  head_branch: string;
  head_sha: string;
}

interface WorkflowDefinition {
  id: number;
  path: string;
}

export function assertConnectorAcceptanceEvidence(
  run: AcceptanceRun,
  workflow: WorkflowDefinition,
  expectedSha: string,
): void {
  if (workflow.path !== '.github/workflows/connector-staging-acceptance.yml' || run.workflow_id !== workflow.id) {
    throw new Error('Run ID must belong to the connector staging acceptance workflow.');
  }
  if (run.event !== 'workflow_dispatch') throw new Error('Connector acceptance must be a manual dispatch.');
  if (run.head_branch !== 'main') throw new Error('Connector acceptance must run from the main branch.');
  if (run.head_sha !== expectedSha) throw new Error('Connector acceptance must verify the exact main commit being released.');
  if (run.status !== 'completed') throw new Error('Connector acceptance run must be completed.');
  if (run.conclusion !== 'success') throw new Error('Connector acceptance run must have a successful conclusion.');
}

function readJson(path: string): unknown {
  return JSON.parse(execFileSync('gh', ['api', path], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }));
}

function main(): void {
  const repository = process.env.GITHUB_REPOSITORY;
  const runId = process.env.STAGING_ACCEPTANCE_RUN_ID;
  const expectedSha = process.env.GITHUB_SHA;
  if (repository !== 'svobonek-lab/dashboard') throw new Error('Connector release is restricted to the StavbaFlow repository.');
  if (!runId || !/^\d{1,20}$/.test(runId)) throw new Error('Provide a numeric successful staging acceptance run ID.');
  if (!expectedSha || !/^[a-f0-9]{40}$/i.test(expectedSha)) throw new Error('GitHub did not provide a valid release commit.');

  const run = readJson(`repos/${repository}/actions/runs/${runId}`) as AcceptanceRun;
  const workflow = readJson(`repos/${repository}/actions/workflows/connector-staging-acceptance.yml`) as WorkflowDefinition;
  assertConnectorAcceptanceEvidence(run, workflow, expectedSha);
  process.stdout.write('Verified successful connector staging acceptance for this main commit.\n');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
