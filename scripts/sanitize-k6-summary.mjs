import { readFile, writeFile } from 'node:fs/promises';

const ALLOWED_METRICS = [
  'http_req_duration{kind:read}',
  'http_req_duration{kind:write}',
  'acceptance_errors',
  'http_req_failed',
  'iterations',
  'http_reqs',
  'checks',
  'public_intake_accepted',
  'public_intake_rate_limited',
  'public_intake_unexpected_responses',
  'dropped_iterations',
];
const ALLOWED_FIELDS = {
  'http_req_duration{kind:read}': ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)'],
  'http_req_duration{kind:write}': ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)'],
  acceptance_errors: ['value'],
  http_req_failed: ['value'],
  iterations: ['count', 'rate'],
  http_reqs: ['count', 'rate'],
  checks: ['passes', 'fails', 'value'],
  public_intake_accepted: ['count', 'rate'],
  public_intake_rate_limited: ['count', 'rate'],
  public_intake_unexpected_responses: ['value'],
  dropped_iterations: ['count', 'rate'],
};

export function sanitizeK6Summary(summary) {
  const metrics = {};
  for (const name of ALLOWED_METRICS) {
    const value = summary?.metrics?.[name];
    if (value) {
      // Threshold results belong to the authoritative k6 log. Keep only
      // unambiguous numeric summaries; Rate passes/fails count zero samples.
      metrics[name] = Object.fromEntries(
        ALLOWED_FIELDS[name].filter((field) => typeof value[field] === 'number')
          .map((field) => [field, value[field]]),
      );
    }
  }
  return { metrics };
}

async function main() {
  const [input, output] = process.argv.slice(2);
  if (!input || !output || process.argv.length !== 4) throw new Error('Usage: node sanitize-k6-summary.mjs INPUT OUTPUT');
  const sanitized = sanitizeK6Summary(JSON.parse(await readFile(input, 'utf8')));
  await writeFile(output, JSON.stringify(sanitized), { encoding: 'utf8', mode: 0o600 });
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/scripts/sanitize-k6-summary.mjs')) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Unable to sanitize k6 summary.');
    process.exitCode = 1;
  });
}
