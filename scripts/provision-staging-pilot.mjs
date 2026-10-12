import { createClient } from '@supabase/supabase-js';

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
const stagingProjectRef = String(process.env.STAGING_SUPABASE_PROJECT_REF || '').trim();
const parsedSupabaseUrl = new URL(supabaseUrl);
if (!/^[a-z0-9]{20}$/.test(stagingProjectRef)
  || parsedSupabaseUrl.protocol !== 'https:'
  || parsedSupabaseUrl.hostname !== `${stagingProjectRef}.supabase.co`)
  throw new Error('Provisioning requires matching STAGING_SUPABASE_URL and STAGING_SUPABASE_PROJECT_REF values.');

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
const actorUserId = String(process.env.STAGING_PLATFORM_ADMIN_USER_ID || '').trim();
if (!/^[0-9a-f]{8}-[0-9a-f-]{27}$/i.test(actorUserId)) throw new Error('Missing valid STAGING_PLATFORM_ADMIN_USER_ID.');

const supabase = createClient(supabaseUrl, serviceRole, {
  auth: { persistSession: false, autoRefreshToken: false },
});

let companyId = '';
let inviteId = '';

async function rollback() {
  if (!companyId || !inviteId) return;
  await supabase.rpc('app_platform_cancel_company_onboarding', {
    p_actor_user_id: actorUserId, p_company_id: companyId, p_invite_id: inviteId,
  });
}

try {
  const provisioned = await supabase.rpc('app_platform_create_company_onboarding', {
    p_actor_user_id: actorUserId,
    p_name: name, p_slug: slug, p_owner_name: ownerName, p_owner_email: ownerEmail, p_plan: 'pilot',
  });
  const row = Array.isArray(provisioned.data) ? provisioned.data[0] : provisioned.data;
  if (provisioned.error || !row?.company_id || !row?.invite_id) throw provisioned.error || new Error('Company onboarding did not return ids.');
  companyId = row.company_id;
  inviteId = row.invite_id;

  const invited = await supabase.auth.admin.inviteUserByEmail(ownerEmail, {
    redirectTo,
    data: { role: 'owner', name: ownerName, company_id: companyId, invite_id: inviteId },
  });
  if (invited.error || !invited.data.user?.id) throw invited.error || new Error('Supabase Auth did not return the invited owner.');

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
