import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const STAGING_PROJECT_REF = 'xwzweltjvreqhjpbjrxa';
const SYNTHETIC_COMPANY_A_ID = '3a51a21e-5b13-48d1-87e9-a5915b46d37d';
const ROW_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const RUN_ID = /^[0-9]{1,12}-[0-9]{1,3}$/;

export function validatePublicLoadCleanupEnvironment(env) {
  let url;
  try {
    url = new URL(String(env.STAGING_SUPABASE_URL || ''));
  } catch {
    throw new Error('Refusing cleanup without the approved staging project URL.');
  }
  if (env.STAGING_SUPABASE_PROJECT_REF !== STAGING_PROJECT_REF
    || !env.PRODUCTION_SUPABASE_PROJECT_REF
    || env.PRODUCTION_SUPABASE_PROJECT_REF === STAGING_PROJECT_REF
    || url.protocol !== 'https:'
    || url.hostname !== `${STAGING_PROJECT_REF}.supabase.co`
    || url.pathname !== '/'
    || url.search
    || url.hash
    || url.username
    || url.password) {
    throw new Error('Refusing cleanup outside the approved staging project.');
  }
  if (env.STAGING_COMPANY_A_ID !== SYNTHETIC_COMPANY_A_ID) {
    throw new Error('Refusing cleanup because the target is not synthetic company A.');
  }
  if (!RUN_ID.test(String(env.STAGING_PUBLIC_LOAD_RUN_ID || ''))) {
    throw new Error('Refusing cleanup without the exact public-load run identifier.');
  }
  if (!env.STAGING_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Refusing cleanup without the staging-only service key.');
  }
  return {
    url: url.origin,
    companyId: SYNTHETIC_COMPANY_A_ID,
    runId: env.STAGING_PUBLIC_LOAD_RUN_ID,
    serviceKey: env.STAGING_SUPABASE_SERVICE_ROLE_KEY,
  };
}

function assertMarkedRows(rows, config) {
  if (!Array.isArray(rows)) throw new Error('Staging public-load cleanup returned an invalid row list.');
  if (rows.length > 5) throw new Error('Refusing public-load cleanup because more than five rows match one rate-limited run.');
  const titlePrefix = `Synthetic public load ${config.runId} `;
  const emailPrefix = `k6-${config.runId}-`;
  for (const row of rows) {
    if (!ROW_ID.test(String(row.id || ''))
      || row.company_id !== config.companyId
      || row.customer !== 'Synthetic Load Customer'
      || typeof row.title !== 'string'
      || !row.title.startsWith(titlePrefix)
      || typeof row.email !== 'string'
      || !row.email.startsWith(emailPrefix)
      || !row.email.endsWith('@example.invalid')
      || row.phone !== '+420700000000'
      || row.source !== 'public_form'
      || Number(row.value) !== 0) {
      throw new Error('Refusing public-load cleanup because a candidate row lacks the exact synthetic markers.');
    }
  }
  return rows;
}

async function fetchMarkedRows(config, fetchImpl) {
  const query = new URLSearchParams({
    select: 'id,company_id,title,customer,email,phone,source,value',
    company_id: `eq.${config.companyId}`,
    customer: 'eq.Synthetic Load Customer',
    title: `like.Synthetic public load ${config.runId} *`,
    email: `like.k6-${config.runId}-*@example.invalid`,
    phone: 'eq.+420700000000',
    source: 'eq.public_form',
    value: 'eq.0',
  });
  const response = await fetchImpl(`${config.url}/rest/v1/app_leads?${query}`, {
    headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
  });
  if (!response.ok) throw new Error(`Staging public-load lookup failed (HTTP ${response.status}).`);
  return assertMarkedRows(await response.json(), config);
}

export async function cleanupPublicIntakeLoad(env, fetchImpl = fetch) {
  const config = validatePublicLoadCleanupEnvironment(env);
  const rows = await fetchMarkedRows(config, fetchImpl);
  for (const row of rows) {
    const query = new URLSearchParams({ id: `eq.${row.id}`, company_id: `eq.${config.companyId}` });
    const response = await fetchImpl(`${config.url}/rest/v1/app_leads?${query}`, {
      method: 'DELETE',
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        Prefer: 'return=representation',
      },
    });
    if (!response.ok) throw new Error(`Staging public-load deletion failed (HTTP ${response.status}).`);
    const deleted = await response.json();
    if (!Array.isArray(deleted) || deleted.length !== 1 || deleted[0]?.id !== row.id || deleted[0]?.company_id !== config.companyId) {
      throw new Error('Staging public-load cleanup did not delete exactly the identified synthetic row.');
    }
  }
  const remaining = await fetchMarkedRows(config, fetchImpl);
  if (remaining.length) throw new Error('Staging public-load cleanup left marked synthetic rows behind.');
  return { rowsRemoved: rows.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try {
    const result = await cleanupPublicIntakeLoad(process.env);
    console.log(`Staging public-load cleanup verified: ${result.rowsRemoved} synthetic rows removed.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Staging public-load cleanup failed.');
    process.exitCode = 1;
  }
}
