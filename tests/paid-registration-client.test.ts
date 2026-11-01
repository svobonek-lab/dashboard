import test from 'node:test';
import assert from 'node:assert/strict';
import { registrationPayload, activationReady } from '../src/features/paid-registration';
test('registration retries preserve request id and agreement timestamp without passwords',()=>{
 const fields={companyName:'Firma',slug:'firma',ownerName:'Owner',plan:'starter' as const};
 const a=registrationPayload(fields,null,()=> 'request-1',()=> '2026-10-24T12:00:00Z');
 const b=registrationPayload(fields,a,()=> 'request-2',()=> '2026-10-24T13:00:00Z');
 assert.deepEqual(a,b);assert.equal('password' in a,false);
 assert.throws(()=>registrationPayload({...fields,slug:'changed'},a),/rozpracovan/);
 assert.throws(()=>registrationPayload({...fields,plan:'growth'},a),/rozpracovan/);
});
test('return URL cannot activate a workspace without verified owner membership and paid company state',()=>{
 assert.equal(activationReady(null,{subscription_status:'active',active:true}),false);
 assert.equal(activationReady({role:'employee',active:true},{subscription_status:'active',active:true}),false);
 assert.equal(activationReady({role:'owner',active:true},{subscription_status:'past_due',active:true}),false);
 assert.equal(activationReady({role:'owner',active:true},{subscription_status:'active',active:true}),true);
});
