import assert from 'node:assert/strict';
import test from 'node:test';
import { canDeleteLeadAttachment } from '../src/features/lead-files/model/deleteEligibility';

const now = new Date('2026-11-18T12:15:00.000Z');

test('owner can delete regardless of author or age', () => {
  assert.equal(canDeleteLeadAttachment('owner', 'owner', 'employee', '2026-10-01T00:00:00.000Z', now), true);
});

test('employee can delete only own record within 15 minutes', () => {
  assert.equal(canDeleteLeadAttachment('employee', 'employee', 'employee', '2026-11-18T12:00:01.000Z', now), true);
  assert.equal(canDeleteLeadAttachment('employee', 'employee', 'employee', '2026-11-18T12:00:00.000Z', now), true);
  assert.equal(canDeleteLeadAttachment('employee', 'employee', 'employee', '2026-11-18T11:59:59.999Z', now), false);
  assert.equal(canDeleteLeadAttachment('employee', 'other', 'employee', '2026-11-18T12:10:00.000Z', now), false);
});

test('missing identity, invalid date and future date hide delete', () => {
  assert.equal(canDeleteLeadAttachment('employee', undefined, 'employee', '2026-11-18T12:10:00.000Z', now), false);
  assert.equal(canDeleteLeadAttachment('employee', 'employee', 'employee', 'bad', now), false);
  assert.equal(canDeleteLeadAttachment('employee', 'employee', 'employee', '2026-11-18T12:16:00.000Z', now), false);
});
