import test from 'node:test';
import assert from 'node:assert/strict';
import { isAssignedToMember, toAppAuditLeadHistory, toAppLead, toAppMember, toPendingInvite } from '../src/shared/api/productionSchema';

const member = { company_id: 'company-a', user_id: 'user-a', name: 'Pracovník', email: 'worker@example.com', role: 'employee' as const, active: true };
const row = {
  id: 'lead-a', company_id: 'company-a', title: 'Rekonstrukce střechy', customer: 'Klient', email: '', phone: '', address: 'Praha',
  description: 'Popis', status: 'new' as const, priority: 'normal' as const, assigned_to: 'user-a', scheduled_at: null,
  duration_minutes: 60, value: 0, source: 'manual', created_at: '2026-09-30T10:00:00Z', updated_at: '2026-09-30T10:00:00Z', revision: 1,
};

test('maps app member without inventing operational data', () => {
  const employee = toAppMember(member);
  assert.equal(employee.id, 'user-a');
  assert.equal(employee.organization_id, 'company-a');
  assert.equal(employee.phone, '');
  assert.equal(employee.capacity, 0);
});

test('maps app lead status and preserves unknown values as empty UI fields', () => {
  const lead = toAppLead(row);
  assert.equal(lead.status, 'New');
  assert.equal(lead.priority, 'Medium');
  assert.equal(lead.assignedEmployeeId, 'user-a');
  assert.equal(lead.source, 'manual');
  assert.equal(lead.price, 0);
  assert.equal(lead.thumbnail, '');
});

test('maps verified app_audit lead status records without requiring app_lead_events', () => {
  const history = toAppAuditLeadHistory({
    id: 42,
    actor: 'user-a',
    action: 'lead_status_changed',
    entity_id: 'lead-a',
    created_at: '2026-10-30T10:00:00Z',
  });
  assert.deepEqual(history, {
    id: '42',
    timestamp: '2026-10-30T10:00:00Z',
    action: 'Stav zakázky změněn',
    author: 'user-a',
  });
});

test('assignment requires the same company and an active member', () => {
  assert.equal(isAssignedToMember(row, member), true);
  assert.equal(isAssignedToMember({ ...row, company_id: 'company-b' }, member), false);
  assert.equal(isAssignedToMember(row, { ...member, active: false }), false);
});

test('pending invitation is visible as pending team member without a fabricated auth id', () => {
  const employee = toPendingInvite({
    id: 'invite-a', company_id: 'company-a', name: 'Budoucí kolega', email: 'new@example.com',
    expires_at: '2026-10-08T10:00:00Z', created_at: '2026-10-01T10:00:00Z', accepted_at: null,
  });
  assert.equal(employee.id, 'invite-a');
  assert.equal(employee.invitationStatus, 'Pending');
  assert.equal(employee.auth_user_id, undefined);
  assert.equal(employee.active, false);
});
