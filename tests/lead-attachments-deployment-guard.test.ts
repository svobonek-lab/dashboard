import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

test('lead attachment acceptance branch cannot auto-deploy through Vercel Git', () => {
  const config = JSON.parse(readFileSync(new URL('../vercel.json', import.meta.url), 'utf8')) as {
    git?: { deploymentEnabled?: Record<string, boolean> };
  };
  assert.equal(config.git?.deploymentEnabled?.['codex/lead-notes-files-acceptance'], false);
});
