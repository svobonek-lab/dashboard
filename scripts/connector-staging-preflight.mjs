import { captureStagingMetadata } from './staging-metadata-snapshot.mjs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REQUIRED_CONNECTOR_TABLES = Object.freeze([
  'app_connector_enrollments',
  'app_connectors',
  'app_connector_mappings',
  'app_connector_requests',
  'app_connector_records',
  'app_connector_commands',
  'app_company_database_settings',
  'app_byodb_operations',
]);

export const REQUIRED_CONNECTOR_FUNCTIONS = Object.freeze([
  'app_tenant_access_token_hook',
  'app_create_connector_enrollment',
  'app_register_connector',
  'app_reserve_connector_request',
  'app_connector_heartbeat',
  'app_ingest_connector_batch',
  'app_get_connector_commands',
  'app_ack_connector_command',
  'app_owner_connector_status',
  'app_save_connector_mapping',
  'app_approve_connector_mapping',
  'app_create_byodb_operation',
  'app_list_byodb_operations',
  'app_poll_byodb_operations',
  'app_ack_byodb_operation',
  'app_get_byodb_context',
  'app_list_byodb_records',
  'app_set_company_database_mode',
]);

export function validateConnectorStagingMetadata(snapshot) {
  const relations = Array.isArray(snapshot?.database?.relations) ? snapshot.database.relations : [];
  const functions = Array.isArray(snapshot?.database?.functions) ? snapshot.database.functions : [];
  const relationNames = new Set(relations.filter(item => item?.schema === 'public').map(item => item.name));
  const functionNames = new Set(functions.filter(item => item?.schema === 'public').map(item => item.name));
  const missingTables = REQUIRED_CONNECTOR_TABLES.filter(name => !relationNames.has(name));
  const missingFunctions = REQUIRED_CONNECTOR_FUNCTIONS.filter(name => !functionNames.has(name));
  const relationByName = new Map(relations.filter(item => item?.schema === 'public').map(item => [item.name, item]));
  const functionByName = new Map(functions.filter(item => item?.schema === 'public').map(item => [item.name, item]));
  const unsafeTables = REQUIRED_CONNECTOR_TABLES.filter(name => {
    const relation = relationByName.get(name);
    return !relation
      || relation.rls_enabled !== true
      || ['anon_table_privileges', 'authenticated_table_privileges'].some(role =>
        !relation[role] || Object.values(relation[role]).some(granted => granted !== false));
  });
  const unsafeFunctions = REQUIRED_CONNECTOR_FUNCTIONS.filter(name => {
    const fn = functionByName.get(name);
    const grants = Array.isArray(fn?.execute_grants) ? fn.execute_grants : [];
    const browserGrant = grants.some(grant => ['PUBLIC', 'anon', 'authenticated'].includes(grant?.grantee));
    const expectedExecutor = name === 'app_tenant_access_token_hook' ? 'supabase_auth_admin' : 'service_role';
    const expectedExecutorPresent = grants.some(grant => grant?.grantee === expectedExecutor && grant?.privilege === 'EXECUTE');
    return !fn || browserGrant || !expectedExecutorPresent;
  });
  const authHook = snapshot?.authHook;
  const expectedHookConfigured = authHook?.customAccessTokenUri?.endsWith('/public/app_tenant_access_token_hook') === true;
  const hookReady = authHook?.readable === true
    && authHook.customAccessTokenEnabled === true
    && authHook.customAccessTokenConfigured === true
    && expectedHookConfigured;
  const issues = [];
  if (missingTables.length) issues.push(`Missing staging tables: ${missingTables.join(', ')}`);
  if (missingFunctions.length) issues.push(`Missing staging functions: ${missingFunctions.join(', ')}`);
  if (unsafeTables.length) issues.push(`Connector tables need RLS and no anon/authenticated table grants: ${unsafeTables.join(', ')}`);
  if (unsafeFunctions.length) issues.push(`Connector functions have unexpected execute grants: ${unsafeFunctions.join(', ')}`);
  if (authHook?.readable !== true) issues.push('Auth hook configuration is not readable with the configured metadata token.');
  else if (!hookReady) issues.push('Custom Access Token hook must be enabled and point to public.app_tenant_access_token_hook.');

  return {
    ready: issues.length === 0,
    projectRef: snapshot?.projectRef ?? null,
    relationCount: relations.length,
    functionCount: functions.length,
    missingTables,
    missingFunctions,
    unsafeTables,
    unsafeFunctions,
    authHookReady: hookReady,
    issues,
  };
}

async function main() {
  const snapshot = await captureStagingMetadata({
    stagingProjectRef: process.env.STAGING_SUPABASE_PROJECT_REF,
    productionProjectRef: process.env.PRODUCTION_SUPABASE_PROJECT_REF,
    accessToken: process.env.SUPABASE_ACCESS_TOKEN,
  });
  const result = validateConnectorStagingMetadata(snapshot);
  if (!result.ready) {
    for (const issue of result.issues) console.error(issue);
    process.exitCode = 1;
    return;
  }
  console.log(JSON.stringify({
    ready: true,
    projectRef: result.projectRef,
    relationCount: result.relationCount,
    functionCount: result.functionCount,
    requiredTablesPresent: true,
    requiredFunctionsPresent: true,
    directBrowserAccessBlocked: true,
    authHookReady: true,
    customerRowsRead: false,
  }));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : 'Staging connector preflight failed.');
    process.exitCode = 1;
  });
}
