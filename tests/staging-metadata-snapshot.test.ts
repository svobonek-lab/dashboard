import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const implementationPath = fileURLToPath(new URL('../scripts/staging-metadata-snapshot.mjs', import.meta.url));

test('staging metadata capture is catalog-only, read-only, and redacts Auth hook secrets', async () => {
  assert.equal(existsSync(implementationPath), true, 'staging metadata capture script must exist');
  const {
    STAGING_METADATA_SQL,
    STAGING_MIGRATION_HISTORY_SQL,
    captureStagingMetadata,
    validateProjectIdentity,
  } = await import('../scripts/staging-metadata-snapshot.mjs');
  const workflow = readFileSync(new URL('../.github/workflows/verify.yml', import.meta.url), 'utf8');
  const snapshotWorkflow = readFileSync(new URL('../.github/workflows/staging-e2e.yml', import.meta.url), 'utf8');

  assert.match(workflow, /staging_metadata_snapshot/);
  assert.match(workflow, /github\.event_name == 'workflow_dispatch'/);
  assert.match(workflow, /inputs\.staging_metadata_snapshot == true/);
  assert.match(workflow, /SUPABASE_ACCESS_TOKEN: \$\{\{ secrets\.SUPABASE_ACCESS_TOKEN \}\}/);
  assert.match(snapshotWorkflow, /- metadata-only/);
  assert.match(snapshotWorkflow, /inputs\.runner_mode == 'metadata-only'/);
  assert.match(snapshotWorkflow, /refs\/heads\/codex\/staging-e2e-local-runner/);
  assert.match(snapshotWorkflow, /runs-on: \[self-hosted, linux, x64, staging-e2e\]/);
  assert.match(snapshotWorkflow, /node scripts\/staging-metadata-snapshot\.mjs > stavbacore-staging-metadata\.json/);
  assert.match(snapshotWorkflow, /actions\/upload-artifact@v4/);
  assert.match(STAGING_METADATA_SQL, /pg_class/);
  assert.match(STAGING_METADATA_SQL, /pg_policies/);
  assert.match(STAGING_METADATA_SQL, /information_schema\.columns/);
  assert.doesNotMatch(STAGING_METADATA_SQL, /information_schema\.(table_privileges|column_privileges)/);
  assert.match(STAGING_METADATA_SQL, /pg_catalog\.aclexplode/);
  assert.match(STAGING_METADATA_SQL, /relacl/);
  assert.match(STAGING_METADATA_SQL, /has_table_privilege/);
  assert.match(STAGING_METADATA_SQL, /attacl/);
  assert.match(STAGING_METADATA_SQL, /aclexplode\(a\.attacl\)[\s\S]*?a\.attacl IS NOT NULL/);
  assert.doesNotMatch(STAGING_METADATA_SQL, /aclexplode\(COALESCE\(a\.attacl/);
  assert.match(STAGING_METADATA_SQL, /left\(c\.relname, 4\) = 'app_'/);
  assert.match(STAGING_METADATA_SQL, /n\.nspname = 'app_private'\s+OR left\(p\.proname, 4\) = 'app_'/);
  assert.doesNotMatch(STAGING_METADATA_SQL, /column_default\s*,/);
  assert.match(STAGING_METADATA_SQL, /pg_get_function_identity_arguments/);
  assert.match(STAGING_METADATA_SQL, /storage\.buckets/);
  assert.match(STAGING_METADATA_SQL, /pg_policies[\s\S]*?schemaname = 'storage'[\s\S]*?tablename = 'objects'/);
  assert.doesNotMatch(STAGING_METADATA_SQL, /select\s+.+\s+from\s+storage\.objects/i);
  assert.match(STAGING_MIGRATION_HISTORY_SQL, /supabase_migrations\.schema_migrations/);
  assert.match(STAGING_MIGRATION_HISTORY_SQL, /jsonb_build_object\('version', version, 'name', name\)/);
  assert.doesNotMatch(
    STAGING_METADATA_SQL,
    /\b(?:INSERT\s+INTO|UPDATE\s+\S+\s+SET|DELETE\s+FROM|ALTER\s+(?:TABLE|FUNCTION|SCHEMA)|DROP\s+(?:TABLE|FUNCTION|SCHEMA)|CREATE\s+(?:TABLE|FUNCTION|SCHEMA)|GRANT\s+\S+\s+ON|REVOKE\s+\S+\s+ON|TRUNCATE\s+\S)/i,
  );
  assert.throws(
    () => validateProjectIdentity('oncmtmrhmjlerbwkrecv', 'oncmtmrhmjlerbwkrecv'),
    /must be isolated from production/,
  );

  const calls: Array<{ url: string; init?: RequestInit }> = [];
  const metadata = { captured_at_utc: '2026-10-26T00:00:00Z', relations: [{ name: 'app_members' }] };
  const history = { versions: [{ version: '20261026000000', name: 'public_intake_rate_limit' }] };
  const result = await captureStagingMetadata({
    stagingProjectRef: 'xwzweltjvreqhjpbjrxa',
    productionProjectRef: 'oncmtmrhmjlerbwkrecv',
    accessToken: 'test-token-not-a-real-secret',
    fetchImpl: async (input, init) => {
      calls.push({ url: String(input), init });
      if (String(input).includes('/database/query/read-only')) {
        const query = JSON.parse(String(init?.body)).query;
        return new Response(JSON.stringify([{ metadata: query === STAGING_MIGRATION_HISTORY_SQL ? history : metadata }]), { status: 201 });
      }
      return new Response(JSON.stringify({
        hook_custom_access_token_enabled: true,
        hook_custom_access_token_uri: 'pg-functions://postgres/auth/app_tenant_access_token_hook',
        hook_custom_access_token_secrets: 'must-not-escape-this-function',
        smtp_pass: 'also-must-not-escape',
      }), { status: 200 });
    },
  });

  assert.equal(calls.length, 3);
  const queryRequest = calls.find(({ url }) => url.includes('/database/query/read-only'));
  assert.ok(queryRequest);
  assert.equal(queryRequest.init?.method, 'POST');
  assert.deepEqual(JSON.parse(String(queryRequest.init?.body)), { query: STAGING_METADATA_SQL });
  assert.equal(new Headers(queryRequest.init?.headers).get('authorization'), 'Bearer test-token-not-a-real-secret');
  assert.deepEqual(result.database, metadata);
  assert.deepEqual(result.migrationHistory, { readable: true, ...history });
  const historyRequest = calls.find(({ init }) => {
    try { return JSON.parse(String(init?.body)).query === STAGING_MIGRATION_HISTORY_SQL; } catch { return false; }
  });
  assert.ok(historyRequest, 'migration history is queried through the read-only SQL endpoint');
  assert.deepEqual(result.authHook, {
    readable: true,
    customAccessTokenEnabled: true,
    customAccessTokenConfigured: true,
    customAccessTokenUri: 'pg-functions://<database>/auth/app_tenant_access_token_hook',
    customAccessTokenSecretConfigured: true,
  });
  assert.doesNotMatch(JSON.stringify(result), /must-not-escape|also-must-not-escape/);

  const { sanitizeAuthHookConfig } = await import('../scripts/staging-metadata-snapshot.mjs');
  assert.equal(
    sanitizeAuthHookConfig({ hook_custom_access_token_uri: 'https://example.test/secret-token?access=secret' }).customAccessTokenUri,
    'https://example.test/<path-redacted>',
  );

  const partial = await captureStagingMetadata({
    stagingProjectRef: 'xwzweltjvreqhjpbjrxa',
    productionProjectRef: 'oncmtmrhmjlerbwkrecv',
    accessToken: 'test-token-not-a-real-secret',
    fetchImpl: async (input, init) => String(input).includes('/database/query/read-only')
      ? new Response(JSON.stringify([{ metadata: JSON.parse(String(init?.body)).query === STAGING_MIGRATION_HISTORY_SQL ? history : metadata }]), { status: 201 })
      : new Response(JSON.stringify({ message: 'forbidden' }), { status: 403 }),
  });
  assert.deepEqual(partial.database, metadata);
  assert.deepEqual(partial.authHook, {
    readable: false,
    error: 'Staging Auth hook configuration metadata query failed with HTTP 403.',
  });
});
