import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../src/pages/owner/settings/ui/Settings.tsx', import.meta.url), 'utf8');

test('storage mode verification failure offers retry while keeping profile saves disabled', () => {
  assert.match(source, /storageModeError/);
  assert.match(source, /storageModeCompanyId/);
  assert.match(source, /setStorageModeLoading\(false\)/);
  assert.match(source, /Zkusit znovu/);
  assert.match(source, /disabled=\{[^}]*storageModeError[^}]*\}/);
  assert.match(source, /storageModeCompanyId !== \(currentOrg\?\.id \?\? null\)/);
});

test('storage mode retry reruns verification for the active company', () => {
  assert.match(source, /setStorageModeRetry\(attempt => attempt \+ 1\)/);
  assert.match(source, /\[currentOrg\?\.id, storageModeRetry\]/);
});
