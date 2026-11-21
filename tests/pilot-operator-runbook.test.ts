import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const runbook = readFileSync(new URL('../docs/pilot-operator-runbook.md', import.meta.url), 'utf8');
const stagingRef = 'xwzweltjvreqhjpbjrxa';

test('pilot runbook gives the exact isolated staging URL and project ref', () => {
  const assignments = [...runbook.matchAll(/\b(STAGING_SUPABASE_URL|STAGING_SUPABASE_PROJECT_REF)=([^`\s]+)/g)]
    .map(([, name, value]) => [name, value]);
  assert.deepEqual(assignments, [
    ['STAGING_SUPABASE_URL', `https://${stagingRef}.supabase.co`],
    ['STAGING_SUPABASE_PROJECT_REF', stagingRef],
  ]);
});
