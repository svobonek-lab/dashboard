import test from 'node:test';
import assert from 'node:assert/strict';
import { isPilotOwnerNavigationPath, isPilotUnavailablePath } from '../src/shared/lib/pilotScope';
import { buildWorkspaceReadiness } from '../src/widgets/workspace-readiness';

const lead = (status: any = 'New', assignedEmployeeId = '') => ({ status, assignedEmployeeId } as any);

test('owner readiness reports the operational path in order', () => {
  const result = buildWorkspaceReadiness({
    organization: { name: 'Dřevo Firma', city: 'Brno' },
    leads: [lead('New', 'emp-1')],
    employees: [{ id: 'emp-1', active: true } as any],
    role: 'owner',
  });
  assert.deepEqual(result.steps.map((step) => step.complete), [true, true, true, false]);
  assert.equal(result.nextStep?.id, 'delivery');
  assert.equal(result.percent, 75);
});

test('owner with no company data fails closed and points to profile first', () => {
  const result = buildWorkspaceReadiness({ organization: null, leads: [], employees: [], role: 'owner' });
  assert.equal(result.completed, 0);
  assert.equal(result.nextStep?.id, 'identity');
  assert.equal(result.percent, 0);
});

test('employee readiness uses only assigned work and never owner metrics', () => {
  const result = buildWorkspaceReadiness({
    organization: { name: 'Dřevo Firma' },
    leads: [lead('In Progress', 'foreign')],
    assignedLeads: [],
    employees: [],
    role: 'employee',
  });
  assert.equal(result.steps[0].complete, false);
  assert.equal(result.steps[1].complete, false);
  assert.equal(result.nextStep?.href, '/employee');
  assert.equal(result.total, 2);
});

test('the sellable pilot exposes only verified owner routes', () => {
  assert.equal(isPilotOwnerNavigationPath('/leads'), true);
  assert.equal(isPilotOwnerNavigationPath('/inquiry?org=pilot-company'), true);
  assert.equal(isPilotOwnerNavigationPath('/quotes'), false);
  assert.equal(isPilotUnavailablePath('/quotes'), true);
  assert.equal(isPilotUnavailablePath('/portal'), true);
});
