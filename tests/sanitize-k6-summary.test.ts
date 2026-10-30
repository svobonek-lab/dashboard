import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeK6Summary } from '../scripts/sanitize-k6-summary.mjs';

test('sanitized k6 artifact contains metric summaries but no fixture setup data', () => {
  const safe = sanitizeK6Summary({
    metrics: {
      'http_req_duration{kind:read}': { 'p(95)': 245, thresholds: { 'p(95)<800': true } },
      acceptance_errors: { value: 0.0001 },
      arbitrary_sensitive_metric: { value: 1 },
    },
    setup_data: { owners: [{ accessToken: 'synthetic-access-token' }] },
  });
  const serialized = JSON.stringify(safe);
  assert.equal(safe.metrics['http_req_duration{kind:read}']['p(95)'], 245);
  assert.equal('arbitrary_sensitive_metric' in safe.metrics, false);
  assert.equal(serialized.includes('setup_data'), false);
  assert.equal(serialized.includes('synthetic-access-token'), false);
});
