import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegistrationCheckoutHandler } from '../api/_billing/registration-checkout.ts';

const req = () => ({ method: 'POST', headers: { authorization: 'Bearer test', 'x-stavbaflow-idempotency-key': '10000000-0000-4000-8000-000000000001' },
 body: { companyName: 'Synthetic', slug: 'synthetic', ownerName: 'Owner', legalConsent: { termsAccepted: true, dpaAccepted: true, acceptedAt: new Date().toISOString() } } });
const response = () => ({ code: 0, body: {} as any, setHeader() {}, status(n:number){this.code=n;return this;},json(v:unknown){this.body=v;} });
function fixture() {
 const calls: string[]=[];
 const deps = {
  enabled: () => true,
  authorize: async () => ({ id: 'owner-verified' }),
  prepare: async (_user: string, input: any) => { calls.push('prepare'); assert.equal(input.plan, 'pilot'); return { id:'intent-1', company_id:'tenant-server', owner_email:'verified@example.invalid' }; },
  customer: async (intent: any) => { calls.push('customer'); return { id:'cus_test' }; },
  session: async (intent: any, customer: string) => { calls.push('session'); assert.equal(intent.company_id,'tenant-server'); return { id:'cs_test',url:'https://checkout.stripe.com/c/pay/test' }; },
  bind: async () => { calls.push('bind'); },
 };
 return { deps,calls };
}
test('registration derives owner on server and returns checkout only after durable binding', async () => {
 const {deps,calls}=fixture();const res=response();
 await createRegistrationCheckoutHandler(deps)(req(),res);
 assert.equal(res.code,200);assert.equal(res.body.url,'https://checkout.stripe.com/c/pay/test');
 assert.deepEqual(calls,['prepare','customer','session','bind']);
});
test('missing agreements or disabled gate never creates a checkout',async()=>{
 for(const disabled of [false,true]){
  const {deps,calls}=fixture();deps.enabled=()=>!disabled;
  const request=req();if(!disabled)request.body.legalConsent.dpaAccepted=false;
  const res=response();await createRegistrationCheckoutHandler(deps)(request,res);
  assert.ok(res.code>=400);assert.deepEqual(calls,[]);
 }
});
test('failed durable binding never exposes the payable URL',async()=>{
 const {deps}=fixture();deps.bind=async()=>{throw new Error('private DB detail');};
 const res=response();await createRegistrationCheckoutHandler(deps)(req(),res);
 assert.equal(res.code,502);assert.equal(res.body.url,undefined);assert.doesNotMatch(JSON.stringify(res.body),/private/);
});
test('unverified auth cannot reach registration or Stripe',async()=>{
 const {deps,calls}=fixture();deps.authorize=async()=>{throw new Error('bad token');};
 const res=response();await createRegistrationCheckoutHandler(deps)(req(),res);
 assert.equal(res.code,401);assert.deepEqual(calls,[]);
});
test('browser price, plan, owner and tenant overrides are never forwarded',async()=>{
 const {deps}=fixture();let owner='';let forwarded:any;
 deps.prepare=async(id,input)=>{owner=id;forwarded=input;return {id:'intent-1',company_id:'tenant-server',owner_email:'verified@example.invalid'};};
 const request=req() as any;
 Object.assign(request.body,{price:'price_attacker',plan:'growth',owner_user_id:'foreign',company_id:'foreign'});
 const res=response();await createRegistrationCheckoutHandler(deps)(request,res);
 assert.equal(res.code,200);assert.equal(owner,'owner-verified');assert.equal(forwarded.plan,'pilot');
 assert.equal(forwarded.price,undefined);assert.equal(forwarded.owner_user_id,undefined);assert.equal(forwarded.company_id,undefined);
});


test('checkout failures log only the failed stage and safe code, never upstream private data',async()=>{
 const {deps}=fixture();deps.customer=async()=>{throw new Error('sk_test_private upstream bearer token');};
 const logs:unknown[][]=[];const old=console.error;console.error=(...args)=>{logs.push(args);};
 try{const res=response();await createRegistrationCheckoutHandler(deps)(req(),res);assert.equal(res.code,502);}finally{console.error=old;}
 assert.equal(logs.length,1);const out=JSON.stringify(logs);assert.match(out,/customer/);assert.doesNotMatch(out,/sk_test_private|bearer token/);
});


test('known provider failure category is observable without raw authentication error text',async()=>{
 const {deps}=fixture();deps.customer=async()=>{throw Object.assign(new Error('sk_test_private'),{type:'StripeAuthenticationError',code:'api_key_expired'});};
 const logs:unknown[][]=[];const old=console.error;console.error=(...args)=>{logs.push(args);};
 try{await createRegistrationCheckoutHandler(deps)(req(),response());}finally{console.error=old;}
 const out=JSON.stringify(logs);assert.match(out,/StripeAuthenticationError/);assert.match(out,/api_key_expired/);assert.doesNotMatch(out,/sk_test_private/);
});
