import { createServerlessSupabaseClient } from '../_shared/supabaseClient.js';
import Stripe from 'stripe';
import { type OwnerLegalConsent } from '../../src/shared/model/legalConsent.js';
import { readBillingConfig, type BillingConfig } from './stripe-checkout.js';

type Request = {
 method?: string; headers?: Record<string,string|string[]|undefined>; body?: unknown;
 [Symbol.asyncIterator]?: () => AsyncIterator<unknown>;
};
type Response = { setHeader(name:string,value:string):void; status(code:number):Response; json(value:unknown):unknown };
export type RegistrationPlan = 'starter' | 'growth' | 'pro';
export type RegistrationInput = { companyName:string; slug:string; ownerName:string; plan:RegistrationPlan; legalConsent:OwnerLegalConsent; requestId:string };
export type RegistrationIntent = { id:string; company_id:string; owner_email:string; plan:RegistrationPlan; stripe_customer_id?:string|null };
interface Dependencies {
 enabled():boolean;
 authorize(req:Request):Promise<{id:string}>;
 assertPlanAvailable(plan:RegistrationPlan):boolean;
 prepare(userId:string,input:RegistrationInput):Promise<RegistrationIntent>;
 customer(intent:RegistrationIntent):Promise<{id:string}>;
 session(intent:RegistrationIntent,customer:string):Promise<{id:string;url:string|null}>;
 bind(intent:RegistrationIntent,customer:string,session:string):Promise<void>;
}
function clients() {
 const url=process.env.SUPABASE_URL;
 const anon=process.env.VITE_SUPABASE_ANON_KEY;
 const service=process.env.SUPABASE_SERVICE_ROLE_KEY;
 if(!url||!anon||!service) throw new Error('registration unavailable');
 const options={auth:{persistSession:false,autoRefreshToken:false}};
 return {auth:createServerlessSupabaseClient(url,anon,options),service:createServerlessSupabaseClient(url,service,options)};
}
class RegistrationBillingConfigurationError extends Error {
 constructor(readonly checks:Record<string,boolean>){super('REGISTRATION_BILLING_CONFIG_INVALID');}
}
class RegistrationPlanUnavailableError extends Error {
 constructor(){super('BILLING_PLAN_UNAVAILABLE');}
}
export function registrationPriceConfigured(plan:RegistrationPlan,config:BillingConfig):boolean {
 return /^price_[A-Za-z0-9]+$/.test(config.prices[plan]);
}
function stripe(plan:RegistrationPlan) {
 const config=readBillingConfig();
 let httpsReturn=false;try{httpsReturn=new URL(config.returnUrl).protocol==='https:';}catch{}
 if(!registrationPriceConfigured(plan,config))throw new RegistrationPlanUnavailableError();
 const checks={testKey:/^(sk|rk)_test_[A-Za-z0-9]+$/.test(config.secretKey),testMode:config.mode==='test',httpsReturn};
 if(!Object.values(checks).every(Boolean))throw new RegistrationBillingConfigurationError(checks);
 return {client:new Stripe(config.secretKey),config};
}
async function body(req:Request):Promise<unknown>{
 if(req.body!==undefined && !Buffer.isBuffer(req.body) && typeof req.body!=='string') return req.body;
 let raw=req.body;
 if(raw===undefined && req[Symbol.asyncIterator]){
  const parts:Buffer[]=[];let bytes=0;
  for await(const chunk of req as AsyncIterable<Uint8Array>){
   const part=Buffer.from(chunk);bytes+=part.length;if(bytes>8192)throw new Error('body limit');
   parts.push(part);
  }
  raw=Buffer.concat(parts);
 }
 if(Buffer.byteLength(String(raw||''))>8192)throw new Error('body limit');
 return JSON.parse(String(raw||'{}'));
}
export function createRegistrationCheckoutHandler(deps:Dependencies){
 return async(req:Request,res:Response)=>{
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST'){res.setHeader('Allow','POST');res.status(405).json({code:'METHOD_NOT_ALLOWED'});return;}
  if(!deps.enabled()){res.status(503).json({code:'PAID_REGISTRATION_DISABLED'});return;}
  let input:RegistrationInput;
  try{
   const raw=await body(req) as Partial<RegistrationInput>;
   const id=req.headers?.['x-stavbaflow-idempotency-key'];
   if(typeof id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)
    ||raw.legalConsent?.termsAccepted!==true||raw.legalConsent?.dpaAccepted!==true
    ||!Number.isFinite(Date.parse(raw.legalConsent?.acceptedAt||''))||typeof raw.companyName!=='string'||!raw.companyName.trim()
    ||raw.companyName.length>160||typeof raw.ownerName!=='string'||!raw.ownerName.trim()||raw.ownerName.length>160
    ||typeof raw.slug!=='string'||!/^[a-z0-9][a-z0-9-]{2,79}$/.test(raw.slug)
    ||!['starter','growth','pro'].includes(String(raw.plan||'')))throw new Error('invalid');
   input={companyName:raw.companyName.trim(),ownerName:raw.ownerName.trim(),slug:raw.slug,
    plan:raw.plan as RegistrationPlan,legalConsent:raw.legalConsent,requestId:id};
  }catch{res.status(400).json({code:'REGISTRATION_INPUT_INVALID'});return;}
  let user:{id:string};
  try{user=await deps.authorize(req);}catch{res.status(401).json({code:'REGISTRATION_AUTH_REQUIRED'});return;}
  try{if(!deps.assertPlanAvailable(input.plan)){res.status(409).json({code:'BILLING_PLAN_UNAVAILABLE'});return;}}
  catch{res.status(503).json({code:'REGISTRATION_BILLING_CONFIG_INVALID'});return;}
  let stage='prepare';
  try{
   const intent=await deps.prepare(user.id,input);
   stage='customer';
   const customer=await deps.customer(intent);
   stage='session';
   const session=await deps.session(intent,customer.id);
   if(!session.url||new URL(session.url).protocol!=='https:'||new URL(session.url).hostname!=='checkout.stripe.com')throw new Error('invalid checkout');
   // A payable URL is never exposed until its exact Stripe bindings are durable.
   stage='bind';
   await deps.bind(intent,customer.id,session.id);
   res.status(200).json({url:session.url});
  }catch(error){
   // Never log request bodies, credentials, Stripe URLs or raw upstream errors.
   const upstream=error as {type?:unknown;code?:unknown}|null;
   const provider=['StripeAuthenticationError','StripeInvalidRequestError','StripeConnectionError','StripeAPIError','StripeRateLimitError','StripeIdempotencyError'].find(type=>type===upstream?.type)??'unknown';
   const providerCode=['api_key_expired','resource_missing','parameter_missing','parameter_invalid_empty','idempotency_key_in_use'].find(code=>code===upstream?.code)??'unknown';
   console.error('registration_checkout_failed',{stage,provider,providerCode,code:error instanceof RegistrationBillingConfigurationError?error.message:'UPSTREAM_FAILURE',...(error instanceof RegistrationBillingConfigurationError?{checks:error.checks}:{})});
   res.status(502).json({code:'REGISTRATION_CHECKOUT_FAILED'});
  }
 };
}
export function registrationSessionInput(intent:RegistrationIntent,customer:string,config:BillingConfig):Stripe.Checkout.SessionCreateParams {
 if(!/^price_[A-Za-z0-9]+$/.test(config.prices[intent.plan]))throw new RegistrationPlanUnavailableError();
 const origin=new URL(config.returnUrl).origin;
 return {mode:'subscription',customer,
  // Ordinary Stripe Billing; never inherit account-level merchant-of-record defaults.
  managed_payments:{enabled:false},
  line_items:[{price:config.prices[intent.plan],quantity:1}],client_reference_id:intent.company_id,
  metadata:{tenant_id:intent.company_id,onboarding:'paid_registration',plan:intent.plan},
  subscription_data:{metadata:{tenant_id:intent.company_id,plan:intent.plan}},
  success_url:origin+'/register-paid?paid=return',cancel_url:origin+'/register-paid?paid=canceled',
 };
}
export default createRegistrationCheckoutHandler({
 enabled:()=>process.env.PAID_ONBOARDING_ENABLED==='true',
 assertPlanAvailable:plan=>{
  const config=readBillingConfig();
  if(!registrationPriceConfigured(plan,config))return false;
  stripe(plan);
  return true;
 },
 authorize:async req=>{
  const header=req.headers?.authorization;
  if(typeof header!=='string'||!/^Bearer \S+$/.test(header))throw new Error('auth required');
  const {data,error}=await clients().auth.auth.getUser(header.slice(7));
  if(error||!data.user?.email_confirmed_at)throw new Error('verified auth required');
  return {id:data.user.id};
 },
 prepare:async(userId,input)=>{
  const {data,error}=await clients().service.rpc('app_prepare_paid_registration',{
   p_user_id:userId,p_request_id:input.requestId,p_name:input.companyName,
   p_slug:input.slug,p_owner_name:input.ownerName,p_client_accepted_at:input.legalConsent.acceptedAt,p_plan:input.plan,
  });
  if(error||!data)throw new Error('registration rejected');
  return data as RegistrationIntent;
 },
 customer:async intent=>{
  if(intent.stripe_customer_id)return {id:intent.stripe_customer_id};
  return stripe(intent.plan).client.customers.create({email:intent.owner_email,metadata:{tenant_id:intent.company_id,plan:intent.plan}},
   {idempotencyKey:'registration-customer:'+intent.id});
 },
 session:async(intent,customer)=>{
  const {client,config}=stripe(intent.plan);
  return client.checkout.sessions.create(registrationSessionInput(intent,customer,config),
   // Version the changed request shape; retries within this version stay stable.
   {idempotencyKey:'registration-checkout:billing-v1:'+intent.id});
 },
 bind:async(intent,customer,session)=>{
  const {error}=await clients().service.rpc('app_bind_registration_checkout',{
   p_intent_id:intent.id,p_customer_id:customer,p_session_id:session,
  });if(error)throw new Error('binding failed');
 },
});
