import test from 'node:test';
import assert from 'node:assert/strict';
import { buildInviteRequest, toPendingEmployee } from '../src/features/employee-invitations';

test('owner invite request uses the server companyId contract', () => {
  assert.deepEqual(buildInviteRequest('11111111-1111-4111-8111-111111111111', {name:'Jan',email:'JAN@Example.com'}), {
    companyId:'11111111-1111-4111-8111-111111111111',name:'Jan',email:'jan@example.com',
  });
});
test('successful invitation becomes pending UI state without fabricated password or link', () => {
  const employee=toPendingEmployee({invited:true,inviteId:'22222222-2222-4222-8222-222222222222',expiresInDays:7},{name:'Jan',email:'jan@example.com'},'11111111-1111-4111-8111-111111111111');
  assert.equal(employee.id,'invite:22222222-2222-4222-8222-222222222222');
  assert.equal(employee.invitationStatus,'Pending');
  assert.equal((employee as any).password,undefined);
  assert.equal((employee as any).inviteLink,undefined);
});
test('malformed server invitation response fails closed', () => {
  assert.throws(()=>toPendingEmployee({invited:false}, {name:'Jan',email:'jan@example.com'},'11111111-1111-4111-8111-111111111111'));
});
