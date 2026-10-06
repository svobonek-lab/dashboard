import assert from 'node:assert/strict';
import test from 'node:test';
import { authorizeConnectorOwner } from '../api/_connector/ownerAuth.js';

function clients(role: string | null, userId = 'user-a') {
  const filters: Array<[string,unknown]> = [];
  const chain:any = { select:()=>chain, eq:(key:string,value:unknown)=>{filters.push([key,value]);return chain;}, maybeSingle:async()=>({data:role?{role}:null,error:null}) };
  return {
    filters,
    auth: { auth: { getUser: async () => ({ data: { user: { id: userId } }, error: null }) } } as any,
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
