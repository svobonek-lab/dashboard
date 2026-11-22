import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { performance } from 'node:perf_hooks';
import { createClient } from '@supabase/supabase-js';
import { digest, openRecovery, stagingOrigin } from './staging-recovery-archive.mjs';

const env = process.env;
const target = 'http://127.0.0.1:54321';
if (env.RECOVERY_TARGET_URL !== target || !env.RECOVERY_TARGET_SERVICE_KEY || !env.RECOVERY_TARGET_ANON_KEY) {
  throw new Error('Recovery requires the exact loopback Supabase target and its local keys');
}
if (!env.RECOVERY_ARCHIVE || !env.RECOVERY_PRIVATE_KEY) throw new Error('Expected the encrypted archive and its recovery key');
const startedAt = performance.now();
const input = JSON.parse(await readFile(env.RECOVERY_ARCHIVE, 'utf8'));
const backup = openRecovery(input, env.RECOVERY_PRIVATE_KEY);
assert.equal(backup.source, stagingOrigin);
assert.match(backup.run, /^[\da-f-]{36}$/);
assert.equal(backup.company.slug, `e2e-recovery-${backup.run}`);
assert.equal(backup.memberships.length, 2);
assert.equal(backup.identities.length, 2);
assert.equal(backup.leads.length, 1);
assert.equal(backup.notes.length, 1);
assert.equal(backup.files.length, 1);
const [lead] = backup.leads;
const [note] = backup.notes;
const [file] = backup.files;
for (const row of [...backup.memberships, lead, note, file]) assert.equal(row.company_id, backup.company.id);
assert.equal(note.lead_id, lead.id);
assert.equal(file.lead_id, lead.id);
assert.equal(backup.object.path, file.storage_path);
assert.equal(file.storage_path, `${backup.company.id}/${lead.id}/${file.id}-${file.file_name}`);
const bytes = Buffer.from(backup.object.base64, 'base64');
assert.equal(bytes.length, file.size_bytes);
assert.equal(digest(bytes), backup.object.sha256);

const client = (key) => createClient(target, key, { auth: { autoRefreshToken: false, persistSession: false } });
const admin = client(env.RECOVERY_TARGET_SERVICE_KEY);
function checked({ data, error }, phase) {
  if (error) throw new Error(`${phase} failed (${error.code || error.status || 'upstream error'})`);
  return data;
}

const targetCompanies = checked(await admin.from('app_companies').select('id').limit(1), 'check empty target');
assert.equal(targetCompanies.length, 0, 'Recovery requires a fresh target');
assert.equal(checked(await admin.storage.getBucket('lead-files'), 'inspect local bucket').public, false);

const passwords = new Map();
for (const identity of backup.identities) {
  assert.ok(backup.memberships.some(member => member.user_id === identity.id && member.email === identity.email));
  assert.match(identity.email, /^(owner|employee)-[\da-f-]{36}@stavbaflow\.example\.test$/);
  const password = randomBytes(32).toString('base64url');
  const { user } = checked(await admin.auth.admin.createUser({
    id: identity.id, email: identity.email, password, email_confirm: true,
  }), 'restore Auth identity');
  assert.equal(user.id, identity.id);
  passwords.set(identity.id, password);
}

const tables = [
  ['app_companies', [backup.company]], ['app_members', backup.memberships], ['app_leads', backup.leads],
  ['app_lead_notes', backup.notes], ['app_lead_files', backup.files],
];
for (const [table, rows] of tables) checked(await admin.from(table).insert(rows), `restore ${table}`);
checked(await admin.storage.from('lead-files').upload(file.storage_path, bytes, {
  contentType: file.mime_type, upsert: false,
}), 'restore private object');

const normalized = (rows, key) => rows.map(row => Object.fromEntries(Object.entries(row).sort()))
  .sort((left, right) => left[key].localeCompare(right[key]));
for (const [table, rows] of tables) {
  const columns = Object.keys(rows[0]).join(',');
  const restored = checked(await admin.from(table).select(columns), `verify ${table}`);
  const key = 'id' in rows[0] ? 'id' : 'user_id';
  assert.deepEqual(normalized(restored, key), normalized(rows, key), `Source and target rows differ for ${table}`);
}

for (const member of backup.memberships) {
  const session = client(env.RECOVERY_TARGET_ANON_KEY);
  const { user } = checked(await session.auth.signInWithPassword({ email: member.email, password: passwords.get(member.user_id) }),
    `sign in as restored ${member.role}`);
  assert.equal(user.id, member.user_id);
  const visibleLeads = checked(await session.from('app_leads').select('id').eq('id', lead.id), 'read scoped lead');
  assert.equal(visibleLeads.length, 1);
  const bucket = session.storage.from('lead-files');
  const { signedUrl } = checked(await bucket.createSignedUrl(file.storage_path, 30), `open private object as ${member.role}`);
  const response = await fetch(signedUrl);
  assert.ok(response.ok, 'The private signed URL must return the restored object');
  assert.equal(digest(Buffer.from(await response.arrayBuffer())), backup.object.sha256);
}
const anonymous = client(env.RECOVERY_TARGET_ANON_KEY);
assert.ok((await anonymous.storage.from('lead-files').createSignedUrl(file.storage_path, 30)).error);
assert.ok(!(await fetch(anonymous.storage.from('lead-files').getPublicUrl(file.storage_path).data.publicUrl)).ok);

console.log(JSON.stringify({
  exerciseRpoMs: backup.simulatedLossAt - backup.snapshotAt,
  restoreAndVerifyMs: Math.round(performance.now() - startedAt),
  leads: backup.leads.length, authIdentities: backup.identities.length, memberships: backup.memberships.length,
  notes: backup.notes.length, files: backup.files.length, privateObjectsOpenedByOwnerAndEmployee: 1,
  anonymousReadDenied: true, sha256Matches: true,
}));
