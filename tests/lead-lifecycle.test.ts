import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionLeadStatus, getEmployeeNextStatus, getLeadTransitionError } from '../src/entities/lead';

test('employee can advance an assigned lead through the normal delivery flow', () => {
  assert.equal(canTransitionLeadStatus('New', 'Contacted', 'employee'), true);
  assert.equal(canTransitionLeadStatus('Contacted', 'Quote', 'employee'), true);
  assert.equal(canTransitionLeadStatus('Quote', 'In Progress', 'employee'), true);
  assert.equal(canTransitionLeadStatus('In Progress', 'Completed', 'employee'), true);
});

test('employee cannot skip a required commercial step', () => {
  assert.equal(canTransitionLeadStatus('New', 'Completed', 'employee'), false);
  assert.equal(getLeadTransitionError('New', 'Completed', 'employee'), 'Tento krok není v pracovním postupu povolený.');
});

test('employee cannot reopen terminal work', () => {
  assert.equal(canTransitionLeadStatus('Completed', 'In Progress', 'employee'), false);
  assert.match(getLeadTransitionError('Completed', 'In Progress', 'employee') || '', /majitel/);
});

test('owner and platform admin can correct any status', () => {
  assert.equal(canTransitionLeadStatus('Completed', 'In Progress', 'owner'), true);
  assert.equal(canTransitionLeadStatus('Lost', 'New', 'super_admin'), true);
});

test('same status is always idempotent', () => {
  assert.equal(canTransitionLeadStatus('Completed', 'Completed', 'employee'), true);
  assert.equal(getLeadTransitionError('Completed', 'Completed', 'employee'), null);
});

test('employee workspace exposes the next persisted lifecycle step', () => {
  assert.equal(getEmployeeNextStatus('New'), 'Contacted');
  assert.equal(getEmployeeNextStatus('Contacted'), 'Quote');
  assert.equal(getEmployeeNextStatus('Quote'), 'In Progress');
  assert.equal(getEmployeeNextStatus('In Progress'), 'Completed');
  assert.equal(getEmployeeNextStatus('Completed'), null);
  assert.equal(getEmployeeNextStatus('Lost'), null);
});
