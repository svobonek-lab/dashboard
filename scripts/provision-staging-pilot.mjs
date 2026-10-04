import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://oncmtmrhmjlerbwkrecv.supabase.co';

function argsToObject(argv) {
  const result = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];
    if (argument === '--apply') {
      result.apply = true;
      continue;
    }
    if (!argument.startsWith('--')) throw new Error(`Unexpected argument: ${argument}`);
    const key = argument.slice(2);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error(`Missing value for --${key}`);
    result[key] = value.trim();
    index += 1;
  }
  return result;
}

function requireValue(input, name) {
  const value = String(input[name] || '').trim();
  if (!value) throw new Error(`Missing required --${name}.`);
  return value;
}

const input = argsToObject(process.argv.slice(2));
const name = requireValue(input, 'name');
const ownerName = requireValue(input, 'owner-name');
const ownerEmail = requireValue(input, 'owner-email').toLowerCase();
const slug = requireValue(input, 'slug').toLowerCase();
if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) throw new Error('Slug must contain only lowercase letters, numbers and single hyphens.');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)) throw new Error('Owner email is invalid.');

const supabaseUrl = String(process.env.STAGING_SUPABASE_URL || '').trim();
if (supabaseUrl !== STAGING_URL) throw new Error('Provisioning is restricted to the isolated StavbaFlow staging project.');

const appUrl = new URL(String(process.env.STAGING_APP_URL || ''));
if (appUrl.protocol !== 'https:') throw new Error('STAGING_APP_URL must use HTTPS.');
const redirectTo = new URL('/login', appUrl).toString();

const plan = {
  environment: 'staging',
  name,
  slug,
  ownerName,
  ownerEmail,
  phone: String(input.phone || '').trim(),
  color: String(input.color || '#2563eb').trim(),
  loginUrl: redirectTo,
  formUrl: new URL(`/inquiry?org=${encodeURIComponent(slug)}`, appUrl).toString(),
};

if (!input.apply) {
  console.log(JSON.stringify({ applied: false, message: 'Dry run only. Repeat with --apply after reviewing this plan.', plan }, null, 2));
  process.exit(0);
}

const serviceRole = String(process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!serviceRole) throw new Error('Missing STAGING_SUPABASE_SERVICE_ROLE_KEY.');

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let authUserId = '';
let companyId = '';

async function rollback() {
  if (companyId) {
    await supabase.from('app_companies').delete().eq('id', companyId);
  }
  if (authUserId) {
    await supabase.auth.admin.deleteUser(authUserId);
  }
}

try {
  const existing = await supabase.from('app_companies').select('id').eq('slug', slug).maybeSingle();
  if (existing.error) throw existing.error;
  if (existing.data) throw new Error(`Company slug already exists: ${slug}`);

  const invited = await supabase.auth.admin.inviteUserByEmail(ownerEmail, {
    redirectTo,
    data: { role: 'owner', name: ownerName, onboarding_slug: slug },
  });
  if (invited.error || !invited.data.user?.id) throw invited.error || new Error('Supabase Auth did not return the invited owner.');
  authUserId = invited.data.user.id;

  const provisioned = await supabase.rpc('app_provision_company', {
    p_name: name,
    p_slug: slug,
    p_owner_user_id: authUserId,
    p_owner_email: ownerEmail,
    p_owner_name: ownerName,
  });
  if (provisioned.error || !provisioned.data) throw provisioned.error || new Error('Company provisioning did not return an id.');
  companyId = provisioned.data;

  const configured = await supabase.from('app_companies').update({
    email: ownerEmail,
    phone: plan.phone,
    color: plan.color,
    public_form: true,
    onboarding_completed: false,
  }).eq('id', companyId).select('id,slug,public_form').single();
  if (configured.error) throw configured.error;

  const metadata = await supabase.auth.admin.updateUserById(authUserId, {
    user_metadata: { role: 'owner', name: ownerName, company_id: companyId },
  });
  if (metadata.error) throw metadata.error;

  console.log(JSON.stringify({
    applied: true,
    companyId,
    slug,
    ownerEmail,
    loginUrl: plan.loginUrl,
    formUrl: plan.formUrl,
    next: 'Owner must open the Supabase invitation, sign in, and complete the pilot operator checklist.',
  }, null, 2));
} catch (error) {
  await rollback();
  throw error;
}
