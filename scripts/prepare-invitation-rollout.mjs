// Emit review SQL only. This command never connects to a database.
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const sources = [
  'supabase/staging/20261105_invitation_rollout_prerequisites.sql',
  'supabase/migrations/20261027000000_app_email_outbox_runs.sql',
  'supabase/staging/20261103_outbox_worker_legacy_compat.sql',
  'supabase/staging/20261013_invite_password_gate.sql',
  'supabase/staging/20261013_invite_password_proof.sql',
  'supabase/staging/20261016_legal_consent_contract.sql',
  'supabase/staging/20261103_invitation_outbox.sql',
];
const root = new URL('../', import.meta.url);
const sections = sources.map(path => {
  const source = readFileSync(new URL(path, root), 'utf8').replace(/\r\n/g, '\n');
  if ((source.match(/^begin;$/gim) || []).length !== 1
    || (source.match(/^commit;$/gim) || []).length !== 1) {
    throw new Error('Expected one transaction wrapper in ' + path);
  }
  const digest = createHash('sha256').update(source).digest('hex');
  const body = source.replace(/^begin;\s*$/gim, '').replace(/^commit;\s*$/gim, '');
  return '-- Source ' + path + '\n-- SHA256 ' + digest + '\n' + body.trim();
});
process.stdout.write([
  '-- STAGING-ONLY REVIEW BUNDLE. Apply only after separate approval.',
  '-- Generated with node scripts/prepare-invitation-rollout.mjs',
  '-- Legacy RPC retirement is a separate step after live acceptance.',
  'begin;',
  ...sections,
  'commit;',
].join('\n\n') + '\n');
