import test from 'node:test';
import assert from 'node:assert/strict';
import { getInvoiceAttemptTime } from '../scripts/stripe-renewal-clock.mjs';

test('Stripe renewal clock advances past automatic invoice finalization', () => {
  assert.equal(getInvoiceAttemptTime({ created: 100, automatically_finalizes_at: 4_000 }), 4_000);
  assert.equal(getInvoiceAttemptTime({ created: 100, automatically_finalizes_at: null }), 3_700);
});

test('Stripe renewal clock rejects invoices without a valid creation time', () => {
  assert.equal(getInvoiceAttemptTime({ created: null, automatically_finalizes_at: null }), null);
  assert.equal(getInvoiceAttemptTime({ created: 0, automatically_finalizes_at: null }), null);
});
