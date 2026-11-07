import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import { createClient } from '@supabase/supabase-js';

export const STAGING_BILLING_COMPANY_C_SLUG = 'e2e-synthetic-company-c';
export const STAGING_BILLING_OWNER_C_EMAIL = 'billing-owner-c@stavbaflow.example.test';
const APPROVED_STAGING_REF = 'xwzweltjvreqhjpbjrxa';

export function assertBillingCompanyCWriteBranch(repository, ref) {
  if (repository !== 'svobonek-lab/dashboard' || ref !== 'refs/heads/codex/billing-blocked-to-granted') {
    throw new Error('Refusing company C writes outside the approved staging billing branch.');
  }
}

function required(env, name) {
  const value = String(env[name] || '').trim();
  if (!value) throw new Error(`Missing required staging billing configuration: ${name}.`);
  return value;
}

export function assertStagingBillingCompanyCTarget(env) {
  const ref = String(env.STAGING_SUPABASE_PROJECT_REF || '').trim();
  const productionRef = String(env.PRODUCTION_SUPABASE_PROJECT_REF || '').trim();
  let url;
  try { url = new URL(String(env.STAGING_SUPABASE_URL || '').trim()); }
  catch { throw new Error('Refusing company C seed: target is not the approved StavbaCore Staging project.'); }
  if (ref !== APPROVED_STAGING_REF || !/^[a-z0-9]{20}$/.test(productionRef) || ref === productionRef ||
      url.protocol !== 'https:' || url.hostname !== `${APPROVED_STAGING_REF}.supabase.co` ||
      url.username || url.password || url.port || url.pathname !== '/' || url.search || url.hash) {
    throw new Error('Refusing company C seed: target is not the approved StavbaCore Staging project.');
  }
  if (String(env.STAGING_OWNER_C_EMAIL || '').trim().toLowerCase() !== STAGING_BILLING_OWNER_C_EMAIL) {
    throw new Error('Refusing company C seed: owner must use the fixed synthetic company C account.');
  }
  return { url: url.origin, ref };
}

export function buildBillingCompanyCFixture(ownerEmail) {
  if (String(ownerEmail || '').trim().toLowerCase() !== STAGING_BILLING_OWNER_C_EMAIL) {
    throw new Error('Refusing company C seed: owner must use the fixed synthetic company C account.');
  }
  return {
    name: 'StavbaFlow Synthetic Billing Company C',
    slug: STAGING_BILLING_COMPANY_C_SLUG,
    email: STAGING_BILLING_OWNER_C_EMAIL,
    plan: 'starter',
    active: true,
    onboarding_completed: true,
    subscription_status: 'not_configured',
  };
}

export function assertBillingCompanyCCanStart(company) {
  if (!company) return;
  if (company.slug !== STAGING_BILLING_COMPANY_C_SLUG) {
    throw new Error('Refusing company C seed: existing row is not the synthetic company C.');
  }
  const customerId = String(company.stripe_customer_id || '').trim();
  const subscriptionId = String(company.stripe_subscription_id || '').trim();
  if (company.subscription_status === 'active' || company.subscription_status === 'trialing' || subscriptionId) {
    throw new Error('Refusing company C seed: tenant is already paid or bound to a subscription.');
  }
  if (customerId && !/^cus_[A-Za-z0-9]+$/.test(customerId)) {
    throw new Error('Refusing company C seed: existing Stripe customer binding is invalid.');
  }
  if (company.active !== true || company.plan !== 'starter') {
    throw new Error('Refusing company C seed: existing synthetic tenant is not an active Starter fixture.');
  }
}

async function findAuthUser(client) {
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error('Unable to inspect synthetic staging Auth users.');
    const found = data.users.find(user => user.email?.toLowerCase() === STAGING_BILLING_OWNER_C_EMAIL);
    if (found) return found;
    if (data.users.length < 1000) return null;
  }
  throw new Error('Synthetic staging Auth user search exceeded the safety limit.');
}

async function ensureOwner(client, existing, password) {
  const attributes = {
    email: STAGING_BILLING_OWNER_C_EMAIL,
    password,
    email_confirm: true,
    user_metadata: { name: 'Synthetic Billing Owner C', role: 'owner' },
  };
  if (existing) {
    const { data, error } = await client.auth.admin.updateUserById(existing.id, attributes);
    if (error || !data.user) throw new Error('Unable to refresh the synthetic staging owner C account.');
    return data.user.id;
  }
  const { data, error } = await client.auth.admin.createUser(attributes);
  if (error || !data.user) throw new Error('Unable to create the synthetic staging owner C account.');
  return data.user.id;
}

export async function seedStagingBillingCompanyC(env = process.env, apply = false) {
  const target = assertStagingBillingCompanyCTarget(env);
  if (!apply) return { applied: false, stagingProjectRef: target.ref, companyId: null, ownerId: null, status: 'not_configured' };

  assertBillingCompanyCWriteBranch(env.GITHUB_REPOSITORY, env.GITHUB_REF);
  const serviceKey = required(env, 'STAGING_SUPABASE_SERVICE_ROLE_KEY');
  const password = required(env, 'STAGING_OWNER_C_PASSWORD');
  const companyFixture = buildBillingCompanyCFixture(env.STAGING_OWNER_C_EMAIL);
  const client = createClient(target.url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

  const { data: company, error: companyLookupError } = await client.from('app_companies')
    .select('id,slug,active,plan,subscription_status,stripe_customer_id,stripe_subscription_id')
    .eq('slug', STAGING_BILLING_COMPANY_C_SLUG).maybeSingle();
  if (companyLookupError) throw new Error('Unable to inspect synthetic staging company C.');
  assertBillingCompanyCCanStart(company);

  const existingUser = await findAuthUser(client);
  if (existingUser) {
    const { data: memberships, error } = await client.from('app_members')
      .select('company_id,role,active').eq('user_id', existingUser.id).eq('active', true);
    if (error || !Array.isArray(memberships) || memberships.some(member =>
      member.company_id !== company?.id || member.role !== 'owner')) {
      throw new Error('Refusing company C seed: synthetic owner already has another active membership.');
    }
  }

  let companyId = company?.id;
  if (companyId) {
    if (company.subscription_status !== 'not_configured') {
      const { error } = await client.from('app_companies').update({ subscription_status: 'not_configured' }).eq('id', companyId);
      if (error) throw new Error('Unable to restore the unbound synthetic company C blocked state.');
    }
  } else {
    const { data, error } = await client.from('app_companies').insert(companyFixture).select('id').single();
    if (error || !data?.id) throw new Error('Unable to create synthetic staging company C.');
    companyId = data.id;
  }

  const ownerId = await ensureOwner(client, existingUser, password);
  const { data: membership, error: membershipLookupError } = await client.from('app_members')
    .select('role,active').eq('company_id', companyId).eq('user_id', ownerId).maybeSingle();
  if (membershipLookupError) throw new Error('Unable to inspect synthetic owner C membership.');
  if (membership && membership.role !== 'owner') throw new Error('Refusing company C seed: account is not an owner membership.');
  const membershipWrite = membership
    ? await client.from('app_members').update({ name: 'Synthetic Billing Owner C', email: STAGING_BILLING_OWNER_C_EMAIL, role: 'owner', active: true })
      .eq('company_id', companyId).eq('user_id', ownerId)
    : await client.from('app_members').insert({ company_id: companyId, user_id: ownerId, name: 'Synthetic Billing Owner C', email: STAGING_BILLING_OWNER_C_EMAIL, role: 'owner', active: true });
  if (membershipWrite.error) throw new Error('Unable to ensure synthetic owner C membership.');

  return { applied: true, stagingProjectRef: target.ref, companyId, ownerId, status: 'not_configured' };
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(arg => arg !== '--apply')) throw new Error('Only --apply is supported.');
  const result = await seedStagingBillingCompanyC(process.env, args.includes('--apply'));
  console.log(JSON.stringify(result));
  if (!result.applied) console.log('Dry run only. No staging records were written.');
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Staging company C seed failed.');
    process.exitCode = 1;
  });
}
