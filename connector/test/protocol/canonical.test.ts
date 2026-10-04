import assert from 'node:assert/strict';
import test from 'node:test';

import {
  fingerprintCanonicalRecord,
  validateCanonicalRecord,
} from '../../src/protocol/canonical.js';
import type { JsonValue } from '../../../shared/connectorProtocol.js';

const base = {
  version: 1 as const,
  sourceSystem: 'fixture-crm',
  sourceTable: 'customers',
  externalId: 'customer-1',
  fingerprint: '0'.repeat(64),
};

function customer(payload: Record<string, JsonValue>) {
  return { ...base, type: 'customer' as const, payload };
}

test('rejects unknown fields and keeps invoices view-only', () => {
  assert.throws(() => validateCanonicalRecord({
    ...base,
    type: 'invoice',
    externalId: 'invoice-1',
    payload: { number: '2026-1', total: 1200, mutateStatus: true },
  }), /unknown field: mutateStatus/);
});

test('fingerprint is independent of object key order', () => {
  assert.equal(
    fingerprintCanonicalRecord(customer({ name: 'ACME', city: 'Brno' })),
    fingerprintCanonicalRecord(customer({ city: 'Brno', name: 'ACME' })),
  );
});

test('normalizes strings and timestamps before accepting a record', () => {
  const value = validateCanonicalRecord({
    ...customer({ name: 'Stavebni\u0301 firma', email: 'info@example.test' }),
    sourceUpdatedAt: '2026-10-04T08:30:00+02:00',
  });

  assert.equal(value.payload.name, 'Stavební firma');
  assert.equal(value.sourceUpdatedAt, '2026-10-04T06:30:00.000Z');
});

test('rejects non-json payload values', () => {
  assert.throws(() => validateCanonicalRecord({
    ...customer({ name: undefined }),
  }), /JSON-safe/);
});
