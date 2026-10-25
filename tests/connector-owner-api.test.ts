import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeConnectorMember, authorizeConnectorOwner } from '../api/_connector/ownerAuth.js';

function clients(role: string | null, userId = 'user-a') {
  const filters: Array<[string,unknown]> = [];
  const chain:any = { select:()=>chain, eq:(key:string,value:unknown)=>{filters.push([key,value]);return chain;}, maybeSingle:async()=>({data:role?{role}:null,error:null}) };
  return {
    filters,
    auth: { auth: { getUser: async () => ({ data: { user: { id: userId, email: `${userId}@example.test` } }, error: null }) } } as any,
    service: { from: (table:string) => { assert.equal(table,'app_members'); return chain; } } as any,
  };
}

test('owner authorization requires bearer session and active same-company owner membership', async () => {
  await assert.rejects(authorizeConnectorOwner({headers:{}},'company-a',clients('owner')), /OWNER_AUTH_REQUIRED/);
  await assert.rejects(authorizeConnectorOwner({headers:{authorization:'Bearer token'}},'company-a',clients('employee')), /OWNER_ACCESS_DENIED/);
  const owner=clients('owner'); const result=await authorizeConnectorOwner({headers:{authorization:'Bearer token'}},'company-a',owner);
  assert.equal(result.userId,'user-a');
  assert.ok(owner.filters.some(([key,value])=>key==='company_id'&&value==='company-a'));
  assert.ok(owner.filters.some(([key,value])=>key==='user_id'&&value==='user-a'));
  assert.ok(owner.filters.some(([key,value])=>key==='active'&&value===true));
});

test('BYODB member authorization accepts only active owners and employees in the requested tenant', async () => {
  await assert.rejects(authorizeConnectorMember({headers:{}},'company-a',clients('employee')), /OWNER_AUTH_REQUIRED/);
  const employee = clients('employee');
  const result = await authorizeConnectorMember({headers:{authorization:'Bearer token'}},'company-a',employee);
  assert.deepEqual({userId:result.userId,role:result.role,companyId:result.companyId},{userId:'user-a',role:'employee',companyId:'company-a'});
  assert.ok(employee.filters.some(([key,value])=>key==='company_id'&&value==='company-a'));
  assert.ok(employee.filters.some(([key,value])=>key==='active'&&value===true));
  await assert.rejects(authorizeConnectorMember({headers:{authorization:'Bearer token'}},'company-a',clients('viewer')), /OWNER_ACCESS_DENIED/);
  await assert.rejects(authorizeConnectorMember({headers:{authorization:'Bearer token'}},'company-a',clients(null)), /OWNER_ACCESS_DENIED/);
});
