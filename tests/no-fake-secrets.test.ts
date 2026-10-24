import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

test('owner settings never ships a fake live API token', () => {
  const source = readFileSync(new URL('../src/pages/owner/settings/ui/Settings.tsx', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /sk_live_[A-Za-z0-9_-]+/i);
});
