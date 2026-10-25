import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

const featureSlices = [
  'manage-leads',
  'import-leads',
  'manage-employees',
  'employee-workflow',
  'employee-invitations',
  'onboarding-checklist',
  'public-demo',
  'submit-inquiry',
  'lead-files',
  'manage-integrations',
] as const;

test('each user scenario exposes a feature public API', () => {
  for (const slice of featureSlices) {
    const publicApi = `src/features/${slice}/index.ts`;
    assert.ok(existsSync(publicApi), `Missing feature public API: ${publicApi}`);
  }
});
