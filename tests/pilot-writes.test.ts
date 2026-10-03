import test from 'node:test';
import assert from 'node:assert/strict';
import { canEditLeadDetails, canWritePilot, persistBeforeApply, toLeadPatch } from '../src/app/pilotWrites';

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
