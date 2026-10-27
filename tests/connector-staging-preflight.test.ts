import assert from 'node:assert/strict';
import test from 'node:test';
import {
  REQUIRED_CONNECTOR_FUNCTIONS,
  REQUIRED_CONNECTOR_TABLES,
  validateConnectorStagingMetadata,
} from '../scripts/connector-staging-preflight.mjs';

const readySnapshot = () => ({
  projectRef: 'xwzweltjvreqhjpbjrxa',
  database: {
    relations: REQUIRED_CONNECTOR_TABLES.map(name => ({
      schema: 'public',
      name,
      rls_enabled: true,
      anon_table_privileges: { select: false, insert: false, update: false, delete: false },
      authenticated_table_privileges: { select: false, insert: false, update: false, delete: false },
    })),
    functions: REQUIRED_CONNECTOR_FUNCTIONS.map(name => ({
      schema: 'public',
      name,
      execute_grants: [{
        grantee: name === 'app_tenant_access_token_hook' ? 'supabase_auth_admin' : 'service_role',
        privilege: 'EXECUTE',
      }],
    })),
  },
  authHook: {
    readable: true,
    customAccessTokenEnabled: true,
    customAccessTokenConfigured: true,
    customAccessTokenUri: 'pg-functions://<database>/public/app_tenant_access_token_hook',
  },
});

test('connector staging preflight accepts the complete schema and enabled tenant hook', () => {
  const result = validateConnectorStagingMetadata(readySnapshot());
  assert.equal(result.ready, true);
  assert.equal(result.projectRef, 'xwzweltjvreqhjpbjrxa');
  assert.equal(result.authHookReady, true);
  assert.deepEqual(result.missingTables, []);
  assert.deepEqual(result.missingFunctions, []);
  assert.deepEqual(result.unsafeTables, []);
  assert.deepEqual(result.unsafeFunctions, []);
});

test('connector staging preflight names missing BYODB tables and RPCs without exposing row data', () => {
  const snapshot = readySnapshot();
  snapshot.database.relations = snapshot.database.relations.filter(({ name }) => name !== 'app_byodb_operations');
  snapshot.database.functions = snapshot.database.functions.filter(({ name }) => name !== 'app_set_company_database_mode');
  const result = validateConnectorStagingMetadata(snapshot);
  assert.equal(result.ready, false);
  assert.deepEqual(result.missingTables, ['app_byodb_operations']);
  assert.deepEqual(result.missingFunctions, ['app_set_company_database_mode']);
  assert.match(result.issues.join(' '), /app_byodb_operations/);
  assert.match(result.issues.join(' '), /app_set_company_database_mode/);
});

test('connector staging preflight blocks a disabled or misdirected Auth hook', () => {
  const snapshot = readySnapshot();
  snapshot.authHook.customAccessTokenEnabled = false;
  snapshot.authHook.customAccessTokenUri = 'pg-functions://<database>/public.other_hook';
  const result = validateConnectorStagingMetadata(snapshot);
  assert.equal(result.ready, false);
  assert.equal(result.authHookReady, false);
  assert.match(result.issues.join(' '), /must be enabled and point to public\.app_tenant_access_token_hook/);
});

test('connector staging preflight blocks missing RLS and direct browser grants', () => {
  const snapshot = readySnapshot();
  const mappings = snapshot.database.relations.find(({ name }) => name === 'app_connector_mappings');
  mappings.rls_enabled = false;
  const operations = snapshot.database.relations.find(({ name }) => name === 'app_byodb_operations');
  operations.authenticated_table_privileges.select = true;
  const result = validateConnectorStagingMetadata(snapshot);
  assert.equal(result.ready, false);
  assert.deepEqual(result.unsafeTables, ['app_connector_mappings', 'app_byodb_operations']);
  assert.match(result.issues.join(' '), /RLS and no anon\/authenticated table grants/);
});

test('connector staging preflight blocks direct browser execution of connector RPCs', () => {
  const snapshot = readySnapshot();
  snapshot.database.functions.find(({ name }) => name === 'app_poll_byodb_operations').execute_grants.push({
    grantee: 'authenticated',
    privilege: 'EXECUTE',
  });
  const result = validateConnectorStagingMetadata(snapshot);
  assert.equal(result.ready, false);
  assert.deepEqual(result.unsafeFunctions, ['app_poll_byodb_operations']);
  assert.match(result.issues.join(' '), /unexpected execute grants/);
});

test('connector staging preflight fails closed when the Auth config cannot be read', () => {
  const snapshot = readySnapshot();
  snapshot.authHook.readable = false;
  snapshot.authHook.customAccessTokenEnabled = false;
  snapshot.authHook.customAccessTokenConfigured = false;
  snapshot.authHook.customAccessTokenUri = '';
  const result = validateConnectorStagingMetadata(snapshot);
  assert.equal(result.ready, false);
  assert.equal(result.authHookReady, false);
  assert.match(result.issues.join(' '), /not readable/);
});
