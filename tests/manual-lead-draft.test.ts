import assert from 'node:assert/strict';
import test from 'node:test';
import { createManualLeadDraft } from '../src/features/manage-leads';

test('manual lead drafts do not invent an id or employee assignment', () => {
  const lead = createManualLeadDraft({
    title: 'Pergola',
    customerName: 'Test zákazník',
    phone: '+420700000001',
    email: 'customer@example.invalid',
    address: 'Testovací 1',
    budget: '55000',
    author: 'owner@example.invalid',
  });

  assert.equal(lead.id, '');
  assert.equal(lead.assignedEmployeeId, '');
  assert.equal(lead.assignedEmployeeName, '');
  assert.deepEqual(lead.aiSummary.risks, []);
  assert.equal(lead.price, 55000);
});
