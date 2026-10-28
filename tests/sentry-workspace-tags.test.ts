import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { getSentryWorkspaceTags } from '../src/shared/lib/sentry';

const providerSource = readFileSync(new URL('../src/app/providers/OrganizationProvider.tsx', import.meta.url), 'utf8');
const boundarySource = readFileSync(new URL('../src/app/providers/ErrorBoundary.tsx', import.meta.url), 'utf8');

test('Sentry workspace tags accept only an internal UUID and approved role', () => {
  assert.deepEqual(getSentryWorkspaceTags({
    companyId: 'a417c2c1-9b65-4c77-8fa8-ff1a2f6e1b92',
    role: 'owner',
  }), {
    company_id: 'a417c2c1-9b65-4c77-8fa8-ff1a2f6e1b92',
    role: 'owner',
  });

  assert.deepEqual(getSentryWorkspaceTags({
    companyId: 'customer-email@example.test',
    role: 'customer-admin',
  }), { company_id: '', role: '' });
});

test('captured errors attach no additional organization, user, or component metadata', () => {
  assert.doesNotMatch(providerSource, /Sentry\.captureException\(err,\s*\{\s*extra:/);
  assert.doesNotMatch(boundarySource, /Sentry\.captureException\(error,\s*\{\s*extra:/);
  assert.doesNotMatch(providerSource, /Sentry\.setUser/);
});
