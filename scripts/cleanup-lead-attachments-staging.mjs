import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createClient } from '@supabase/supabase-js';

const stagingRef = 'xwzweltjvreqhjpbjrxa';
const companyId = '3a51a21e-5b13-48d1-87e9-a5915b46d37d';
const leadId = '76832e4c-9fbf-4877-84a2-cd830667844b';

export function cleanupPlan(env) {
  const run = String(env.STAGING_ATTACHMENT_CLEANUP_RUN_ID || '');
  if (!/^[0-9a-f]{8}$/.test(run) ||
      env.STAGING_SUPABASE_PROJECT_REF !== stagingRef ||
      env.STAGING_SUPABASE_URL !== `https://${stagingRef}.supabase.co` ||
      !env.PRODUCTION_SUPABASE_PROJECT_REF || env.PRODUCTION_SUPABASE_PROJECT_REF === stagingRef ||
      env.STAGING_COMPANY_A_ID !== companyId || env.STAGING_LEAD_A_ID !== leadId ||
      !env.STAGING_SUPABASE_PUBLISHABLE_KEY || !env.STAGING_OWNER_A_EMAIL || !env.STAGING_OWNER_A_PASSWORD) {
    throw new Error('Exact synthetic staging cleanup configuration is invalid.');
  }
  return {
    run,
    names: [`owner-${run}.pdf`, `owner-${run}.jpg`, `employee-${run}.pdf`, `employee-${run}.jpg`],
    noteBodies: [`Synthetic attachment owner ${run}`, `Synthetic attachment employee ${run}`],
    folder: `${companyId}/${leadId}/`,
  };
}

export async function cleanupLeadAttachments(env) {
  const plan = cleanupPlan(env);
  const client = createClient(env.STAGING_SUPABASE_URL, env.STAGING_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const signedIn = await client.auth.signInWithPassword({
    email: env.STAGING_OWNER_A_EMAIL,
    password: env.STAGING_OWNER_A_PASSWORD,
  });
  if (signedIn.error || !signedIn.data.session) throw new Error('Synthetic staging owner authentication failed.');

  const filesResult = await client.from('app_lead_files').select('id,file_name,storage_path')
    .eq('company_id', companyId).eq('lead_id', leadId).in('file_name', plan.names);
  if (filesResult.error) throw new Error('Synthetic staging file lookup failed.');
  const files = filesResult.data || [];
  for (const file of files) {
    if (!plan.names.includes(file.file_name) ||
        !file.storage_path.startsWith(plan.folder) ||
        file.storage_path !== `${plan.folder}${file.id}-${file.file_name}`) {
      throw new Error('Synthetic staging file path does not match its exact metadata row.');
    }
  }
  if (files.length) {
    const removed = await client.storage.from('lead-files').remove(files.map(file => file.storage_path));
    if (removed.error || removed.data?.length !== files.length) {
      throw new Error('Exact synthetic Storage object removal was incomplete; metadata was retained.');
    }
    const deleted = await client.from('app_lead_files').delete().eq('company_id', companyId)
      .eq('lead_id', leadId).in('id', files.map(file => file.id)).select('id');
    if (deleted.error || deleted.data?.length !== files.length) {
      throw new Error('Exact synthetic file metadata removal was incomplete.');
    }
  }

  const notesResult = await client.from('app_lead_notes').select('id').eq('company_id', companyId)
    .eq('lead_id', leadId).in('body', plan.noteBodies);
  if (notesResult.error) throw new Error('Synthetic staging note lookup failed.');
  const notes = notesResult.data || [];
  if (notes.length) {
    const deleted = await client.from('app_lead_notes').delete().eq('company_id', companyId)
      .eq('lead_id', leadId).in('id', notes.map(note => note.id)).select('id');
    if (deleted.error || deleted.data?.length !== notes.length) {
      throw new Error('Exact synthetic note removal was incomplete.');
    }
  }
  return { files: files.length, notes: notes.length };
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  try {
    const result = await cleanupLeadAttachments(process.env);
    console.log(`Exact synthetic staging cleanup complete: ${result.files} files, ${result.notes} notes.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Synthetic staging cleanup failed.');
    process.exitCode = 1;
  }
}
