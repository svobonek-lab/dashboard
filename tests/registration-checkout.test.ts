import test from 'node:test';
import assert from 'node:assert/strict';
import { createRegistrationCheckoutHandler, registrationPriceConfigured, registrationSessionInput } from '../api/_billing/registration-checkout.ts';
import { readFileSync } from 'node:fs';

test('registration uses ordinary Billing regardless of account Managed Payments defaults',()=>{
 const input=registrationSessionInput({id:'intent',company_id:'tenant-server',owner_email:'verified@example.invalid',plan:'starter'},'cus_test',{
  secretKey:'sk_test_unitonly',mode:'test',returnUrl:'https://preview.example.invalid/path',prices:{pilot:'price_legacy',starter:'price_allowed',growth:'price_growth',pro:'price_pro'},
 });
 assert.deepEqual(input.managed_payments,{enabled:false});
 assert.equal(input.mode,'subscription');
 assert.deepEqual(input.line_items,[{price:'price_allowed',quantity:1}]);
 assert.deepEqual(input.metadata,{tenant_id:'tenant-server',onboarding:'paid_registration',plan:'starter'});
 assert.equal(input.client_reference_id,'tenant-server');
 assert.equal(input.success_url,'https://preview.example.invalid/register-paid?paid=return');
});

const req = (plan = 'starter') => ({ method: 'POST', headers: { authorization: 'Bearer test', 'x-stavbaflow-idempotency-key': '10000000-0000-4000-8000-000000000001' },
 body: { companyName: 'Synthetic', slug: 'synthetic', ownerName: 'Owner', plan, legalConsent: { termsAccepted: true, dpaAccepted: true, acceptedAt: new Date().toISOString() } } });
const response = () => ({ code: 0, body: {} as any, setHeader() {}, status(n:number){this.code=n;return this;},json(v:unknown){this.body=v;} });
function fixture() {
 const calls: string[]=[];
 const deps = {
  enabled: () => true,
  authorize: async () => ({ id: 'owner-verified' }),
  assertPlanAvailable: () => true,
  prepare: async (_user: string, input: any) => { calls.push('prepare'); assert.equal(input.plan, 'starter'); return { id:'intent-1', company_id:'tenant-server', owner_email:'verified@example.invalid', plan:input.plan }; },
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
 deps.prepare=async(id,input)=>{owner=id;forwarded=input;return {id:'intent-1',company_id:'tenant-server',owner_email:'verified@example.invalid',plan:input.plan};};
 const request=req() as any;
 Object.assign(request.body,{price:'price_attacker',plan:'growth',owner_user_id:'foreign',company_id:'foreign'});
 const res=response();await createRegistrationCheckoutHandler(deps)(request,res);
 assert.equal(res.code,200);assert.equal(owner,'owner-verified');assert.equal(forwarded.plan,'growth');
 assert.equal(forwarded.price,undefined);assert.equal(forwarded.owner_user_id,undefined);assert.equal(forwarded.company_id,undefined);
});

test('registration rejects pilot and unrecognized plans before creating an intent', async () => {
 for (const plan of ['pilot', 'attacker-plan']) {
  const {deps,calls}=fixture();
  const res=response();
  await createRegistrationCheckoutHandler(deps)(req(plan),res);
  assert.equal(res.code,400);
  assert.deepEqual(res.body,{code:'REGISTRATION_INPUT_INVALID'});
  assert.deepEqual(calls,[]);
 }
});

test('registration accepts only configured monthly price IDs and leaves Profi unavailable without one',()=>{
 const config={secretKey:'sk_test_unitonly',mode:'test' as const,returnUrl:'https://preview.example.invalid',
  prices:{pilot:'price_legacy',starter:'price_starter',growth:'price_growth',pro:''}};
 assert.equal(registrationPriceConfigured('starter',config),true);
 assert.equal(registrationPriceConfigured('growth',config),true);
 assert.equal(registrationPriceConfigured('pro',config),false);
});

test('pro registration fails closed when its Stripe price is not configured', async () => {
 const {deps,calls}=fixture();
 deps.assertPlanAvailable=()=>false;
 const res=response();
 await createRegistrationCheckoutHandler(deps)(req('pro'),res);
 assert.equal(res.code,409);
 assert.deepEqual(res.body,{code:'BILLING_PLAN_UNAVAILABLE'});
 assert.deepEqual(calls,[]);
});

test('staging migration stores only monthly registration plans and removes the pilot RPC signature', () => {
 const sql=readFileSync(new URL('../supabase/staging/20261101131053_three_tier_monthly_plans.sql',import.meta.url),'utf8');
 assert.match(sql,/drop function public\.app_prepare_paid_registration\(uuid,uuid,text,text,text,timestamptz\)/i);
 assert.match(sql,/p_plan not in \('starter', 'growth', 'pro'\)/i);
 assert.match(sql,/v\.plan is distinct from p_plan/i);
 assert.match(sql,/grant execute on function public\.app_prepare_paid_registration\(uuid,uuid,text,text,text,timestamptz,text\)\s+to service_role/i);
 assert.doesNotMatch(sql,/pilot'\s*,\s*p_request_id/i);
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
