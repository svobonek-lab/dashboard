import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

export const STAGING_METADATA_SQL = `
SELECT jsonb_build_object(
  'captured_at_utc', to_char(clock_timestamp() AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.US"Z"'),
  'relations', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'name', c.relname,
      'relkind', c.relkind,
      'rls_enabled', c.relrowsecurity,
      'rls_forced', c.relforcerowsecurity
    ) ORDER BY n.nspname, c.relname)
    FROM pg_catalog.pg_class AS c
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND left(c.relname, 4) = 'app_'
      AND c.relkind IN ('r', 'p')
  ), '[]'::jsonb),
  'columns', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schema', table_schema,
      'table', table_name,
      'ordinal', ordinal_position,
      'name', column_name,
      'data_type', data_type,
      'udt_name', udt_name,
      'nullable', is_nullable,
      'has_default', column_default IS NOT NULL
    ) ORDER BY table_schema, table_name, ordinal_position)
    FROM information_schema.columns
    WHERE table_schema = 'public' AND left(table_name, 4) = 'app_'
  ), '[]'::jsonb),
  'policies', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schema', schemaname,
      'table', tablename,
      'name', policyname,
      'permissive', permissive,
      'command', cmd,
      'roles', roles,
      'using', qual,
      'with_check', with_check
    ) ORDER BY schemaname, tablename, policyname)
    FROM pg_catalog.pg_policies
    WHERE schemaname = 'public' AND left(tablename, 4) = 'app_'
  ), '[]'::jsonb),
  'table_grants', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'grantee', grantee,
      'schema', table_schema,
      'table', table_name,
      'privilege', privilege_type,
      'grantable', is_grantable
    ) ORDER BY table_schema, table_name, grantee, privilege_type)
    FROM information_schema.table_privileges
    WHERE table_schema = 'public' AND left(table_name, 4) = 'app_'
  ), '[]'::jsonb),
  'column_grants', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'grantee', grantee,
      'schema', table_schema,
      'table', table_name,
      'column', column_name,
      'privilege', privilege_type,
      'grantable', is_grantable
    ) ORDER BY table_schema, table_name, column_name, grantee, privilege_type)
    FROM information_schema.column_privileges
    WHERE table_schema = 'public' AND left(table_name, 4) = 'app_'
  ), '[]'::jsonb),
  'functions', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'name', p.proname,
      'identity_arguments', pg_catalog.pg_get_function_identity_arguments(p.oid),
      'result', pg_catalog.pg_get_function_result(p.oid),
      'language', l.lanname,
      'owner', pg_catalog.pg_get_userbyid(p.proowner),
      'security_definer', p.prosecdef,
      'volatility', p.provolatile,
      'config', p.proconfig,
      'execute_grants', COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'grantee', COALESCE(r.rolname, 'PUBLIC'),
          'privilege', x.privilege_type,
          'grantable', x.is_grantable
        ) ORDER BY COALESCE(r.rolname, 'PUBLIC'), x.privilege_type)
        FROM pg_catalog.aclexplode(COALESCE(p.proacl, pg_catalog.acldefault('f', p.proowner))) AS x
        LEFT JOIN pg_catalog.pg_roles AS r ON r.oid = x.grantee
      ), '[]'::jsonb)
    ) ORDER BY n.nspname, p.proname, pg_catalog.pg_get_function_identity_arguments(p.oid))
    FROM pg_catalog.pg_proc AS p
    JOIN pg_catalog.pg_namespace AS n ON n.oid = p.pronamespace
    JOIN pg_catalog.pg_language AS l ON l.oid = p.prolang
    WHERE n.nspname IN ('public', 'app_private')
      AND (left(p.proname, 4) = 'app_' OR p.proname IN ('app_role', 'app_can_lead'))
  ), '[]'::jsonb),
  'triggers', COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'schema', n.nspname,
      'table', c.relname,
      'name', t.tgname,
      'enabled', t.tgenabled,
      'definition', pg_catalog.pg_get_triggerdef(t.oid, true),
      'function_schema', fn.nspname,
      'function_name', proc.proname,
      'function_arguments', pg_catalog.pg_get_function_identity_arguments(proc.oid)
    ) ORDER BY n.nspname, c.relname, t.tgname)
    FROM pg_catalog.pg_trigger AS t
    JOIN pg_catalog.pg_class AS c ON c.oid = t.tgrelid
    JOIN pg_catalog.pg_namespace AS n ON n.oid = c.relnamespace
    JOIN pg_catalog.pg_proc AS proc ON proc.oid = t.tgfoid
    JOIN pg_catalog.pg_namespace AS fn ON fn.oid = proc.pronamespace
    WHERE n.nspname = 'public' AND left(c.relname, 4) = 'app_'
      AND NOT t.tgisinternal
  ), '[]'::jsonb)
) AS metadata;
`;

export function validateProjectIdentity(stagingProjectRef, productionProjectRef) {
  if (!/^[a-z0-9]{20}$/.test(String(stagingProjectRef || ''))) {
    throw new Error('STAGING_SUPABASE_PROJECT_REF must be a 20-character Supabase project ref.');
  }
  if (!/^[a-z0-9]{20}$/.test(String(productionProjectRef || ''))) {
    throw new Error('PRODUCTION_SUPABASE_PROJECT_REF must be a 20-character Supabase project ref.');
  }
  if (stagingProjectRef === productionProjectRef) {
    throw new Error('Staging metadata capture must be isolated from production.');
  }
}

function sanitizeHookUri(value) {
  if (typeof value !== 'string' || value.length === 0) return null;
  const pgFunction = value.match(/^pg-functions:\/\/[^/]+\/(.+)$/i);
  if (pgFunction) return `pg-functions://<database>/${pgFunction[1]}`;
  try {
    const parsed = new URL(value);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname === '/' ? '/' : '/<path-redacted>'}`;
  } catch {
    return 'configured (value redacted)';
  }
}

export function sanitizeAuthHookConfig(config) {
  const uri = sanitizeHookUri(config?.hook_custom_access_token_uri);
  return {
    customAccessTokenEnabled: config?.hook_custom_access_token_enabled === true,
    customAccessTokenConfigured: uri !== null,
    customAccessTokenUri: uri,
    customAccessTokenSecretConfigured: Boolean(config?.hook_custom_access_token_secrets),
  };
}

async function readJson(response, label) {
  const body = await response.json().catch(() => null);
  if (!response.ok) {
    const missingPermissions = Array.isArray(body?.missing_permissions)
      ? ` Missing token permissions: ${body.missing_permissions.filter((permission) => /^[a-z_]+$/.test(permission)).join(', ')}.`
      : '';
    throw new Error(`${label} failed with HTTP ${response.status}.${missingPermissions}`);
  }
  return body;
}

export async function captureStagingMetadata({
  stagingProjectRef,
  productionProjectRef,
  accessToken,
  fetchImpl = fetch,
}) {
  validateProjectIdentity(stagingProjectRef, productionProjectRef);
  if (typeof accessToken !== 'string' || accessToken.trim().length === 0) {
    throw new Error('SUPABASE_ACCESS_TOKEN is required for the read-only metadata request.');
  }

  const baseUrl = `https://api.supabase.com/v1/projects/${stagingProjectRef}`;
  const headers = {
    Authorization: `Bearer ${accessToken}`,
    'Content-Type': 'application/json',
  };
  const [databaseResponse, authResponse] = await Promise.all([
    fetchImpl(`${baseUrl}/database/query/read-only`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ query: STAGING_METADATA_SQL }),
    }),
    fetchImpl(`${baseUrl}/config/auth`, { method: 'GET', headers }),
  ]);
  const [database, authConfig] = await Promise.all([
    readJson(databaseResponse, 'Read-only staging database metadata query (database_read)'),
    readJson(authResponse, 'Staging Auth hook configuration metadata query'),
  ]);

  return {
    projectRef: stagingProjectRef,
    productionProjectRef,
    database,
    authHook: sanitizeAuthHookConfig(authConfig),
  };
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : '';
if (invokedPath === import.meta.url) {
  try {
    const snapshot = await captureStagingMetadata({
      stagingProjectRef: process.env.STAGING_SUPABASE_PROJECT_REF,
      productionProjectRef: process.env.PRODUCTION_SUPABASE_PROJECT_REF,
      accessToken: process.env.SUPABASE_ACCESS_TOKEN,
    });
    console.log(JSON.stringify(snapshot, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Staging metadata capture failed.');
    process.exitCode = 1;
  }
}
