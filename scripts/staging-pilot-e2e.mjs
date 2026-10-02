import assert from 'node:assert/strict';
import { createClient } from '@supabase/supabase-js';

const url = process.env.STAGING_SUPABASE_URL;
const key = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
if (!url || !key) throw new Error('Missing staging Supabase URL or publishable key.');
if (url !== 'https://oncmtmrhmjlerbwkrecv.supabase.co') throw new Error('This check may run only against the isolated staging project.');

function account(prefix) {
  const email = process.env[`${prefix}_EMAIL`];
  const password = process.env[`${prefix}_PASSWORD`];
  if (!email || !password) throw new Error(`Missing ${prefix} staging credentials.`);
  return [email, password];
}
const accounts = {
  ownerA: account('STAGING_OWNER_A'),
  employeeA: account('STAGING_EMPLOYEE_A'),
  ownerB: account('STAGING_OWNER_B'),
};
const companyA = 'a0000000-0000-4000-8000-000000000001';
const companyB = 'b0000000-0000-4000-8000-000000000002';
const employeeAId = 'a2000000-0000-4000-8000-000000000002';

async function signedIn([email, password]) {
  const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error } = await client.auth.signInWithPassword({ email, password });
  assert.ifError(error);
  return client;
}

const [ownerA, employeeA, ownerB] = await Promise.all([
  signedIn(accounts.ownerA), signedIn(accounts.employeeA), signedIn(accounts.ownerB),
]);

const ownerALeads = await ownerA.from('app_leads').select('id,company_id,title,status,assigned_to');
const ownerBLeads = await ownerB.from('app_leads').select('id,company_id,title,status,assigned_to');
const employeeLeads = await employeeA.from('app_leads').select('id,company_id,title,status,assigned_to');
assert.ifError(ownerALeads.error);
assert.ifError(ownerBLeads.error);
assert.ifError(employeeLeads.error);
assert.ok(ownerALeads.data.length >= 1 && ownerALeads.data.every((lead) => lead.company_id === companyA));
assert.ok(ownerBLeads.data.length >= 1 && ownerBLeads.data.every((lead) => lead.company_id === companyB));
assert.ok(employeeLeads.data.length >= 1 && employeeLeads.data.every((lead) => lead.company_id === companyA && lead.assigned_to === employeeAId));

const crossRead = await ownerA.from('app_leads').select('id').eq('company_id', companyB);
assert.ifError(crossRead.error);
assert.equal(crossRead.data.length, 0);

const inserted = await ownerA.from('app_leads').insert({
  company_id: companyA,
  title: 'E2E trvalá poptávka',
  customer: 'Syntetický zákazník',
  status: 'new',
  assigned_to: employeeAId,
  value: 42000,
  source: 'e2e',
}).select('id,status,revision').single();
assert.ifError(inserted.error);
const leadId = inserted.data.id;

const ownerAdvance = await ownerA.from('app_leads').update({ status: 'contacted' }).eq('id', leadId).select('status,revision').single();
assert.ifError(ownerAdvance.error);
assert.equal(ownerAdvance.data.status, 'contacted');

const employeeAdvance = await employeeA.from('app_leads').update({ status: 'in_progress' }).eq('id', leadId).select('status,revision').single();
assert.ifError(employeeAdvance.error);
assert.equal(employeeAdvance.data.status, 'in_progress');

const forbiddenValueChange = await employeeA.from('app_leads').update({ value: 1 }).eq('id', leadId).select('id');
assert.ok(forbiddenValueChange.error, 'Employee price mutation must be rejected.');

const crossMutation = await ownerB.from('app_leads').update({ status: 'lost' }).eq('id', leadId).select('id');
assert.ifError(crossMutation.error);
assert.equal(crossMutation.data.length, 0);

const events = await ownerA.from('app_lead_events').select('operation,new_status').eq('lead_id', leadId).order('created_at');
assert.ifError(events.error);
assert.ok(events.data.length >= 3);

await ownerA.auth.signOut();
const reloadedOwner = await signedIn(accounts.ownerA);
const persisted = await reloadedOwner.from('app_leads').select('status,assigned_to').eq('id', leadId).single();
assert.ifError(persisted.error);
assert.equal(persisted.data.status, 'in_progress');
assert.equal(persisted.data.assigned_to, employeeAId);

console.log(JSON.stringify({
  passed: true,
  tenantIsolation: true,
  employeeScope: true,
  ownerWrite: true,
  employeeStatusWrite: true,
  historyPersisted: true,
  logoutReloadPersisted: true,
}));
