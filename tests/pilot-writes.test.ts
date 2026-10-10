import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLeadAssignment, buildLeadAssignmentPatch, canEditLeadDetails, canWritePilot, getAssignableEmployees, hydrateLeadAssignments, persistBeforeApply, toLeadPatch } from '../src/app/pilotWrites';

const lead = { id: 'lead-a', organization_id: 'company-a', assignedEmployeeId: '', assignedEmployeeName: '' } as any;
const worker = (overrides: Record<string, unknown> = {}) => ({
  id: '11111111-1111-4111-8111-111111111111',
  organization_id: 'company-a',
  name: 'Jan Pracovník',
  email: 'jan@example.invalid',
  role: 'employee',
  active: true,
  invitationStatus: 'Active',
  ...overrides,
} as any);

test('pilot writes require explicit staging URL and flag; production URLs never qualify', () => {
  assert.equal(canWritePilot({VITE_PILOT_WRITES:'true',VITE_SUPABASE_URL:'https://oncmtmrhmjlerbwkrecv.supabase.co'}),true);
  assert.equal(canWritePilot({VITE_PILOT_WRITES:'true',VITE_SUPABASE_URL:'https://xwzweltjvreqhjpbjrxa.supabase.co'}),false);
  assert.equal(canWritePilot({VITE_SUPABASE_URL:'https://oncmtmrhmjlerbwkrecv.supabase.co'}),false);
});
test('partial lead edits do not erase unsupplied fields and preserve quote state', () => {
  assert.deepEqual(toLeadPatch({status:'Quote'}),{status:'scheduled'});
  assert.deepEqual(toLeadPatch({assignedEmployeeId:''}),{assigned_to:null});
  assert.deepEqual(toLeadPatch({price:0,title:'Test'}),{value:0,title:'Test'});
});
test('invalid values cannot silently become a different persisted value', () => {
  assert.throws(()=>toLeadPatch({price:NaN}));
  assert.throws(()=>toLeadPatch({status:'unknown' as any}));
  assert.throws(()=>toLeadPatch({assignedEmployeeId:'fake-employee'}));
  assert.throws(()=>toLeadPatch({preferredDate:'Dle dohody'}));
});

test('employees cannot edit lead details through the optimistic owner editor', () => {
  assert.equal(canEditLeadDetails('employee'), false);
  assert.equal(canEditLeadDetails('owner'), true);
  assert.equal(canEditLeadDetails('super_admin'), true);
});

test('owner assignment lists only active employees from the current company', () => {
  const eligible = worker();
  const employees = [
    eligible,
    worker({ id: '22222222-2222-4222-8222-222222222222', organization_id: 'company-b' }),
    worker({ id: '33333333-3333-4333-8333-333333333333', active: false }),
    worker({ id: '44444444-4444-4444-8444-444444444444', invitationStatus: 'Pending' }),
    worker({ id: '55555555-5555-4555-8555-555555555555', role: 'owner' }),
  ];
  assert.deepEqual(getAssignableEmployees(employees, 'company-a').map((item) => item.id), [eligible.id]);
});

test('lead assignment persists a real same-company employee identity', () => {
  const eligible = worker();
  assert.deepEqual(
    buildLeadAssignment(lead, eligible.id, [eligible], 'company-a'),
    { ...lead, assignedEmployeeId: eligible.id, assignedEmployeeName: eligible.name },
  );
  assert.throws(() => buildLeadAssignment(lead, 'missing', [eligible], 'company-a'), /aktivního zaměstnance/);
  assert.deepEqual(
    buildLeadAssignment({ ...lead, assignedEmployeeId: eligible.id, assignedEmployeeName: eligible.name }, '', [eligible], 'company-a'),
    lead,
  );
});

test('assignment updates contain no stale business fields', () => {
  assert.deepEqual(buildLeadAssignmentPatch('lead-1', { id: 'employee-1', name: 'Petr' } as any), {
    id: 'lead-1',
    assignedEmployeeId: 'employee-1',
    assignedEmployeeName: 'Petr',
  });
  assert.deepEqual(buildLeadAssignmentPatch('lead-1'), {
    id: 'lead-1',
    assignedEmployeeId: '',
    assignedEmployeeName: '',
  });
});

test('freshly loaded leads recover the assigned employee name from the verified team list', () => {
  const sameCompanyEmployee = worker();
  const hydrated = hydrateLeadAssignments([
    { ...lead, assignedEmployeeId: sameCompanyEmployee.id, assignedEmployeeName: '' },
  ], [sameCompanyEmployee]);
  assert.equal(hydrated[0].assignedEmployeeId, sameCompanyEmployee.id);
  assert.equal(hydrated[0].assignedEmployeeName, sameCompanyEmployee.name);
});

test('a UI mutation is applied only after the database confirms persistence', async () => {
  let resolvePersist!: (value: string) => void;
  const persisted = new Promise<string>((resolve) => { resolvePersist = resolve; });
  const applied: string[] = [];
  const operation = persistBeforeApply(() => persisted, (value) => applied.push(value));

  await Promise.resolve();
  assert.deepEqual(applied, []);
  resolvePersist('confirmed');
  assert.equal(await operation, 'confirmed');
  assert.deepEqual(applied, ['confirmed']);
});

test('a failed database write never applies a successful-looking UI mutation', async () => {
  const applied: string[] = [];
  await assert.rejects(
    () => persistBeforeApply(async () => { throw new Error('write failed'); }, (value: string) => applied.push(value)),
    /write failed/,
  );
  assert.deepEqual(applied, []);
});
