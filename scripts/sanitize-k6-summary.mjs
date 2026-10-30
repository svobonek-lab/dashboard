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

export function sanitizeK6Summary(summary) {
  const metrics = {};
  for (const name of ALLOWED_METRICS) {
    const value = summary?.metrics?.[name];
    if (value) metrics[name] = value;
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
