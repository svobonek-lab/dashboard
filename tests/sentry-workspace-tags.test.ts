import assert from 'node:assert/strict';
import test from 'node:test';
import { getSentryWorkspaceTags } from '../src/shared/lib/sentry';

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
