import { createClient } from '@supabase/supabase-js';

const STAGING_URL = 'https://oncmtmrhmjlerbwkrecv.supabase.co';

function parseArgs(argv) {
  const input = { apply: false };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') { input.apply = true; continue; }
    if (arg !== '--email') throw new Error(`Unexpected argument: ${arg}`);
    const value = argv[index + 1];
    if (!value || value.startsWith('--')) throw new Error('Missing value for --email.');
    input.email = value.trim().toLowerCase();
    index += 1;
  }
  return input;
}

function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 2)}***@${domain}`;
}

const input = parseArgs(process.argv.slice(2));
const normalizedEmail = String(input.email || '').trim().toLowerCase();
if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) throw new Error('A valid --email is required.');

const supabaseUrl = String(process.env.STAGING_SUPABASE_URL || '').trim();
if (supabaseUrl !== STAGING_URL) throw new Error('Provisioning is restricted to the isolated StavbaFlow staging project.');
const serviceRole = String(process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY || '').trim();
if (!serviceRole) throw new Error('Missing STAGING_SUPABASE_SERVICE_ROLE_KEY.');

const supabase = createClient(supabaseUrl, serviceRole, { auth: { persistSession: false, autoRefreshToken: false } });
const matches = [];
for (let page = 1; page <= 100; page += 1) {
  const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
  if (error) throw error;
  const users = data?.users || [];
  matches.push(...users.filter((user) => String(user.email || '').trim().toLowerCase() === normalizedEmail));
  if (users.length < 1000) break;
}
if (matches.length !== 1) throw new Error(`Expected exactly one existing Auth user, found ${matches.length}.`);
const authUser = matches[0];

const plan = { environment: 'staging', userId: authUser.id, email: maskEmail(normalizedEmail), role: 'platform_admin' };
if (!input.apply) {
  console.log(JSON.stringify({ applied: false, message: 'Dry run only. Repeat with --apply after reviewing this plan.', plan }, null, 2));
  process.exit(0);
}

const { error: adminError } = await supabase.from('app_platform_admins').upsert({
  user_id: authUser.id,
  active: true,
  revoked_at: null,
  notes: 'Initial StavbaFlow platform operator',
}, { onConflict: 'user_id' });
if (adminError) throw adminError;

const { error: auditError } = await supabase.from('app_platform_audit_events').insert({
  actor_user_id: authUser.id,
  action: 'platform_admin.activated',
  outcome: 'allowed',
  reason_code: 'staging_operator_apply',
});
if (auditError) {
  await supabase.from('app_platform_admins').update({ active: false, revoked_at: new Date().toISOString() }).eq('user_id', authUser.id);
  throw new Error('Audit write failed; platform access was disabled.');
}

console.log(JSON.stringify({ applied: true, userId: authUser.id, email: maskEmail(normalizedEmail), next: 'Verify unified login, /admin routing, API denial tests, and metadata evidence.' }, null, 2));
