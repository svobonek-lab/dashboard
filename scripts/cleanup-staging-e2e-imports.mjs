import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const STAGING_PROJECT_REF = 'xwzweltjvreqhjpbjrxa';
const SYNTHETIC_COMPANY_A_ID = '3a51a21e-5b13-48d1-87e9-a5915b46d37d';
const SYNTHETIC_CUSTOMER = 'Synthetic Playwright Customer';
const SYNTHETIC_TITLE_PREFIX = 'StavbaFlow Playwright Import ';
const FINGERPRINT = /^csv_[a-f0-9]{8}$/i;

export function validateStagingCleanupEnvironment(env) {
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
    throw new Error('Refusing cleanup because the synthetic company A identity does not match.');
  }
  if (!env.STAGING_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Refusing cleanup without the staging-only service key.');
  }
  return { url: url.origin, companyId: SYNTHETIC_COMPANY_A_ID, serviceKey: env.STAGING_SUPABASE_SERVICE_ROLE_KEY };
}

function assertSyntheticRows(rows, companyId) {
  if (!Array.isArray(rows)) throw new Error('Staging cleanup returned an invalid row list.');
  for (const row of rows) {
    if (row.company_id !== companyId
      || row.customer !== SYNTHETIC_CUSTOMER
      || typeof row.title !== 'string'
      || !row.title.startsWith(SYNTHETIC_TITLE_PREFIX)
      || typeof row.import_fingerprint !== 'string'
      || !FINGERPRINT.test(row.import_fingerprint)) {
      throw new Error('Refusing cleanup because a candidate lead does not match the exact synthetic import marker.');
    }
  }
  return rows;
}

async function fetchSyntheticRows(config, fetchImpl) {
  const query = new URLSearchParams({
    select: 'id,company_id,title,customer,import_fingerprint',
    company_id: `eq.${config.companyId}`,
    customer: `eq.${SYNTHETIC_CUSTOMER}`,
    title: `like.${SYNTHETIC_TITLE_PREFIX}*`,
    import_fingerprint: 'not.is.null',
  });
  const response = await fetchImpl(`${config.url}/rest/v1/app_leads?${query}`, {
    headers: { apikey: config.serviceKey, Authorization: `Bearer ${config.serviceKey}` },
  });
  if (!response.ok) throw new Error(`Staging synthetic import lookup failed (HTTP ${response.status}).`);
  return assertSyntheticRows(await response.json(), config.companyId);
}

export async function cleanupStagingE2eImports(env, fetchImpl = fetch) {
  const config = validateStagingCleanupEnvironment(env);
  const rows = await fetchSyntheticRows(config, fetchImpl);
  const byFingerprint = new Map();
  for (const row of rows) {
    const group = byFingerprint.get(row.import_fingerprint) || [];
    group.push(row);
    byFingerprint.set(row.import_fingerprint, group);
  }

  for (const [fingerprint, matchingRows] of byFingerprint) {
    const response = await fetchImpl(`${config.url}/rest/v1/rpc/app_rollback_import`, {
      method: 'POST',
      headers: {
        apikey: config.serviceKey,
        Authorization: `Bearer ${config.serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_company_id: config.companyId, p_fingerprint: fingerprint }),
    });
    if (!response.ok) throw new Error(`Staging synthetic import rollback failed (HTTP ${response.status}).`);
    const result = await response.json();
    if (result?.status !== 'rolled_back' || result?.deleted !== matchingRows.length) {
      throw new Error('Staging synthetic import rollback did not remove exactly the marked rows.');
    }
  }

  const remainingRows = await fetchSyntheticRows(config, fetchImpl);
  if (remainingRows.length) throw new Error('Staging synthetic import cleanup left marked rows behind.');
  return { importsRolledBack: byFingerprint.size, rowsRemoved: rows.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href;
if (isMain) {
  try {
    const result = await cleanupStagingE2eImports(process.env);
    console.log(`Staging cleanup verified: ${result.importsRolledBack} marked imports rolled back; ${result.rowsRemoved} synthetic rows removed.`);
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Staging synthetic import cleanup failed.');
    process.exitCode = 1;
  }
}
