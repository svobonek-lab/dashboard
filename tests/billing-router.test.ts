import assert from 'node:assert/strict';
import test from 'node:test';

import billingHandler from '../api/billing.ts';

test('legacy public registration route stays closed even when its feature flag is enabled', async () => {
  const previous = process.env.PAID_ONBOARDING_ENABLED;
  process.env.PAID_ONBOARDING_ENABLED = 'true';
  try {
    const response = {
      statusCode: 0,
      payload: undefined as unknown,
      setHeader() {},
      status(code: number) { this.statusCode = code; return this; },
      json(payload: unknown) { this.payload = payload; return this; },
    };
    await billingHandler({ method: 'POST', query: { route: 'register' } }, response);
    assert.equal(response.statusCode, 404);
    assert.deepEqual(response.payload, { code: 'BILLING_ROUTE_NOT_FOUND' });
  } finally {
    if (previous === undefined) delete process.env.PAID_ONBOARDING_ENABLED;
    else process.env.PAID_ONBOARDING_ENABLED = previous;
  }
});
