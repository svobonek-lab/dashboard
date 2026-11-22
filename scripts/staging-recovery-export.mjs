import { createPublicKey, randomBytes, randomUUID } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { createClient } from '@supabase/supabase-js';
import { digest, sealRecovery, stagingOrigin } from './staging-recovery-archive.mjs';

const env = process.env;
if (env.STAGING_SUPABASE_URL !== stagingOrigin || !env.STAGING_SUPABASE_SERVICE_ROLE_KEY || !env.RECOVERY_ARCHIVE) {
  throw new Error('Expected the exact isolated staging URL, staging credential and archive path');
}
const publicKey = createPublicKey({ key: Buffer.from(env.RECOVERY_PUBLIC_KEY ?? '', 'base64'), type: 'spki', format: 'der' });
if (publicKey.asymmetricKeyType !== 'rsa' || publicKey.asymmetricKeyDetails.modulusLength < 3072) {
  throw new Error('Expected an RSA public key of at least 3072 bits');
}

const client = createClient(stagingOrigin, env.STAGING_SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const run = randomUUID();
const companyId = randomUUID();
const leadId = randomUUID();
const fileId = randomUUID();
const slug = `e2e-recovery-${run}`;
const fileName = 'recovery-fixture.pdf';
const path = `${companyId}/${leadId}/${fileId}-${fileName}`;
const objectBytes = Buffer.from(`%PDF-1.4\n% Synthetic recovery file ${run}\n%%EOF\n`);
const storage = client.storage.from('lead-files');
const members = [];

function checked({ data, error }, phase) {
  if (error) throw new Error(`${phase} failed (${error.code || error.status || 'upstream error'})`);
  return data;
}

try {
  checked(await client.from('app_companies').insert({ id: companyId, name: 'Synthetic recovery drill', slug, active: true }), 'create company');
  for (const role of ['owner', 'employee']) {
    const email = `${role}-${run}@stavbaflow.example.test`;
    const { user } = checked(await client.auth.admin.createUser({
      email, email_confirm: true, password: randomBytes(32).toString('base64url'),
    }), 'create synthetic identity');
    members.push({ company_id: companyId, user_id: user.id, email, name: `Synthetic ${role}`, role, active: true });
  }
  checked(await client.from('app_members').insert(members), 'create memberships');
  checked(await client.from('app_leads').insert({
    id: leadId, company_id: companyId, title: 'Synthetic recovery lead', customer: 'Synthetic recovery customer',
    assigned_to: members[1].user_id, status: 'new', source: 'manual',
  }), 'create lead');
  checked(await client.from('app_lead_notes').insert({
    company_id: companyId, lead_id: leadId, author_id: members[1].user_id, body: 'Synthetic recovery note',
  }), 'create note');
  checked(await storage.upload(path, objectBytes, { contentType: 'application/pdf', upsert: false }), 'upload private fixture');
  checked(await client.from('app_lead_files').insert({
    id: fileId, company_id: companyId, lead_id: leadId, author_id: members[0].user_id,
    storage_path: path, file_name: fileName, mime_type: 'application/pdf', size_bytes: objectBytes.byteLength,
  }), 'link private fixture');

  const snapshotAt = Date.now();
  const [company, memberships, leads, notes, files, bucket, blob, identities] = await Promise.all([
    client.from('app_companies').select('id,name,slug,active,created_at').eq('id', companyId).eq('slug', slug).single(),
    client.from('app_members').select('company_id,user_id,name,email,role,active').eq('company_id', companyId),
    client.from('app_leads').select('id,company_id,title,customer,assigned_to,status,source,created_at,updated_at').eq('company_id', companyId),
    client.from('app_lead_notes').select('id,company_id,lead_id,author_id,body,created_at').eq('company_id', companyId),
    client.from('app_lead_files').select('id,company_id,lead_id,author_id,storage_path,file_name,mime_type,size_bytes,created_at').eq('company_id', companyId),
    client.storage.getBucket('lead-files'),
    storage.download(path),
    Promise.all(members.map(member => client.auth.admin.getUserById(member.user_id))),
  ]);
  const bytes = Buffer.from(await checked(blob, 'download private fixture').arrayBuffer());
  const backup = {
    source: stagingOrigin, run, snapshotAt,
    company: checked(company, 'export company'),
    memberships: checked(memberships, 'export memberships'),
    leads: checked(leads, 'export leads'),
    notes: checked(notes, 'export notes'),
    files: checked(files, 'export file metadata'),
    identities: identities.map(result => {
      const { user } = checked(result, 'export identity mapping');
      return { id: user.id, email: user.email };
    }),
    object: { path, sha256: digest(bytes), base64: bytes.toString('base64') },
  };
  if (backup.memberships.length !== 2 || backup.leads.length !== 1 || backup.notes.length !== 1 || backup.files.length !== 1
      || !bytes.equals(objectBytes) || checked(bucket, 'inspect fixture bucket').public !== false) {
    throw new Error('Snapshot does not match the isolated synthetic fixture');
  }
  backup.simulatedLossAt = Date.now();
  await writeFile(env.RECOVERY_ARCHIVE, JSON.stringify(sealRecovery(backup, publicKey)), { flag: 'wx', mode: 0o600 });
  console.log(JSON.stringify({ snapshotAt: new Date(snapshotAt).toISOString(), exportMs: Date.now() - snapshotAt,
    snapshotAgeMs: backup.simulatedLossAt - snapshotAt, leads: 1, authIdentities: 2, notes: 1, files: 1, privateObjects: 1 }));
} finally {
  // Each removal is scoped to the IDs allocated by this execution.
  const failures = [];
  const cleanup = async (promise, phase) => {
    try { checked(await promise, phase); } catch { failures.push(phase); }
  };
  await cleanup(storage.remove([path]), 'private object');
  for (const table of ['app_lead_files', 'app_lead_notes', 'app_lead_events', 'app_leads', 'app_members']) {
    await cleanup(client.from(table).delete().eq('company_id', companyId), table);
  }
  await cleanup(client.from('app_companies').delete().eq('id', companyId).eq('slug', slug), 'company');
  for (const member of members) await cleanup(client.auth.admin.deleteUser(member.user_id), 'identity');
  if (failures.length) throw new Error(`Synthetic cleanup needs review for ${slug}: ${failures.join(', ')}`);
  console.log('Synthetic source fixture removed.');
}
