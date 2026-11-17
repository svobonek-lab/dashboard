import { readdir, readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function verifySchemaSnapshot(snapshot, expectedVersions, { stagingProjectRef, productionProjectRef }, contracts = null) {
  const errors = [];
  if (!/^[a-z0-9]{20}$/.test(String(stagingProjectRef || '')) || !/^[a-z0-9]{20}$/.test(String(productionProjectRef || ''))) {
    errors.push('Staging and production project refs must both be valid Supabase refs.');
  } else if (stagingProjectRef === productionProjectRef) {
    errors.push('Schema snapshot must identify a staging project distinct from production.');
  }
  if (snapshot?.projectRef !== stagingProjectRef || snapshot?.productionProjectRef !== productionProjectRef) {
    errors.push('Schema snapshot project identity does not match the declared staging and production refs.');
  }

  const history = snapshot?.migrationHistory;
  if (history?.readable !== true || !Array.isArray(history.versions)) {
    errors.push('Schema snapshot migration history is missing or unreadable; capture fresh staging metadata.');
  } else {
    const actualVersions = history.versions.map((entry) => String(entry?.version || '')).filter(Boolean).sort();
    const expected = [...expectedVersions].map(String).sort();
    const missing = expected.filter((version) => !actualVersions.includes(version));
    const unexpected = actualVersions.filter((version) => !expected.includes(version));
    if (missing.length) errors.push(`Repo migrations absent from the staging snapshot: ${missing.join(', ')}.`);
    if (unexpected.length) errors.push(`Staging snapshot has migration versions absent from the repo: ${unexpected.join(', ')}.`);
    if (new Set(actualVersions).size !== actualVersions.length) errors.push('Staging migration history contains duplicate versions.');
  }

  const databases = snapshot?.database;
  const metadata = Array.isArray(databases) ? databases[0]?.metadata : databases;
  if (!metadata || typeof metadata.captured_at_utc !== 'string'
    || !Array.isArray(metadata.relations) || !Array.isArray(metadata.columns)
    || !Array.isArray(metadata.policies) || !Array.isArray(metadata.functions)
    || !metadata.storage || !Array.isArray(metadata.storage.buckets) || !Array.isArray(metadata.storage.policies)) {
    errors.push('Schema snapshot lacks complete database, RLS, function, or Storage metadata.');
  }

  if (metadata && contracts) {
    const missing = [];
    const relations = new Set(metadata.relations.map((entry) => `${entry.schema}.${entry.name}`));
    const columns = new Set(metadata.columns.map((entry) => `${entry.schema}.${entry.table}.${entry.name}`));
    const policies = new Set(metadata.policies.map((entry) => `${entry.schema}.${entry.table}.${entry.name}`));
    const functions = new Set(metadata.functions.map((entry) => `${entry.schema}.${entry.name}`));
    for (const table of contracts.tables || []) {
      const relation = `${table.schema}.${table.name}`;
      if (!relations.has(relation)) missing.push(`table ${relation}`);
      for (const column of table.columns || []) {
        if (!columns.has(`${relation}.${column}`)) missing.push(`column ${relation}.${column}`);
      }
    }
    for (const policy of contracts.policies || []) {
      if (!policies.has(`${policy.schema}.${policy.table}.${policy.name}`)) missing.push(`policy ${policy.schema}.${policy.table}.${policy.name}`);
    }
    for (const fn of contracts.functions || []) {
      if (!functions.has(`${fn.schema}.${fn.name}`)) missing.push(`function ${fn.schema}.${fn.name}`);
    }
    if (missing.length) errors.push(`Migration schema objects absent from the snapshot: ${missing.join(', ')}.`);
  }

  return { ok: errors.length === 0, errors };
}

export function verifyDocumentedSchemaDrift(result, baseline, { snapshotSha256, migrationTreeSha256 }) {
  const exactSources = /^[a-f0-9]{64}$/.test(String(snapshotSha256))
    && /^[a-f0-9]{64}$/.test(String(migrationTreeSha256))
    && baseline?.snapshotSha256 === snapshotSha256
    && baseline?.migrationTreeSha256 === migrationTreeSha256;
  if (result.ok) return exactSources
    ? result
    : { ok: false, errors: ['Schema snapshot or migration SQL differs from the reviewed baseline.'] };
  const knownDifference = /^(Repo migrations absent from the staging snapshot|Staging snapshot has migration versions absent from the repo|Migration schema objects absent from the snapshot): /;
  const exactInventory = Array.isArray(baseline?.errors)
    && result.errors.length > 0
    && result.errors.every((error) => knownDifference.test(error))
    && JSON.stringify(result.errors) === JSON.stringify(baseline.errors);
  if (exactInventory && exactSources) return { ok: true, errors: [], documentedDrift: result.errors };
  return { ok: false, errors: [...result.errors, 'Schema drift differs from the reviewed baseline; reconcile it before updating the baseline.'] };
}

function stripSqlComments(sql) {
  return sql.replace(/--[^\r\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
}

function stripSqlBodiesAndStrings(sql) {
  return sql
    .replace(/\$([a-zA-Z_][\w]*)?\$[\s\S]*?\$\1?\$/g, ' ')
    .replace(/'(?:''|[^'])*'/g, "''");
}

function splitTopLevelCommaList(source) {
  const parts = [];
  let depth = 0;
  let start = 0;
  let quote = false;
  for (let i = 0; i < source.length; i += 1) {
    if (source[i] === "'") {
      if (quote && source[i + 1] === "'") { i += 1; continue; }
      quote = !quote;
    } else if (!quote && source[i] === '(') depth += 1;
    else if (!quote && source[i] === ')') depth -= 1;
    else if (!quote && depth === 0 && source[i] === ',') {
      parts.push(source.slice(start, i));
      start = i + 1;
    }
  }
  parts.push(source.slice(start));
  return parts;
}

export function extractMigrationSchemaContracts(sqlFiles) {
  const tables = new Map();
  const policies = new Map();
  const functions = new Map();
  for (const { file, sql: rawSql } of sqlFiles) {
    const source = stripSqlComments(rawSql);
    const sql = stripSqlBodiesAndStrings(source);
    const tableRegex = /create\s+table\s+(?:if\s+not\s+exists\s+)?([\w\"]+(?:\.[\w\"]+)?)\s*\(/gi;
    for (const match of sql.matchAll(tableRegex)) {
      const nameParts = match[1].replaceAll('"', '').split('.');
      const schema = nameParts.length === 2 ? nameParts[0] : 'public';
      const name = nameParts.at(-1);
      let depth = 1;
      let end = match.index + match[0].length;
      let quote = false;
      for (; end < sql.length && depth > 0; end += 1) {
        if (sql[end] === "'") {
          if (quote && sql[end + 1] === "'") { end += 1; continue; }
          quote = !quote;
        } else if (!quote && sql[end] === '(') depth += 1;
        else if (!quote && sql[end] === ')') depth -= 1;
      }
      if (depth !== 0) throw new Error(`Cannot safely parse CREATE TABLE in ${file} for ${schema}.${name}.`);
      const body = sql.slice(match.index + match[0].length, end - 1);
      const columns = splitTopLevelCommaList(body).map((part) => part.trim().match(/^(?:"([^"]+)"|([a-zA-Z_][\w$]*))\s+/)?.slice(1).find(Boolean))
        .filter((column) => column && !/^(constraint|primary|foreign|unique|check|exclude)$/i.test(column));
      tables.set(`${schema}.${name}`, { schema, name, columns: new Set(columns) });
    }
    for (const match of sql.matchAll(/create\s+policy\s+(?:"([^"]+)"|([\w$]+))\s+on\s+([\w\"]+(?:\.[\w\"]+)?)/gi)) {
      const nameParts = match[3].replaceAll('"', '').split('.');
      policies.set(`${nameParts.length === 2 ? nameParts[0] : 'public'}.${nameParts.at(-1)}.${match[1] || match[2]}`, {
        schema: nameParts.length === 2 ? nameParts[0] : 'public', table: nameParts.at(-1), name: match[1] || match[2],
      });
    }
    const dynamicPolicyBody = source.match(/\$boundaries\$([\s\S]*?)\$boundaries\$/i)?.[1] || '';
    const loop = dynamicPolicyBody.match(/foreach\s+(\w+)\s+in\s+array\s+array\s*\[([\s\S]*?)\]\s*loop[\s\S]*?create\s+policy\s+(?:"([^"]+)"|([\w$]+))\s+on\s+[^']*%i/i);
    if (loop) {
      const policyName = loop[3] || loop[4];
      for (const table of loop[2].matchAll(/'([a-zA-Z_][\w$]*)'/g)) {
        const name = table[1];
        policies.set(`public.${name}.${policyName}`, { schema: 'public', table: name, name: policyName });
      }
    }
    for (const match of sql.matchAll(/create\s+(?:or\s+replace\s+)?function\s+([\w\"]+(?:\.[\w\"]+)?)\s*\(/gi)) {
      const nameParts = match[1].replaceAll('"', '').split('.');
      functions.set(`${nameParts.length === 2 ? nameParts[0] : 'public'}.${nameParts.at(-1)}`, {
        schema: nameParts.length === 2 ? nameParts[0] : 'public', name: nameParts.at(-1),
      });
    }

    for (const match of sql.matchAll(/alter\s+table\s+(?:only\s+)?([\w\"]+(?:\.[\w\"]+)?)\s+add\s+column\s+(?:if\s+not\s+exists\s+)?(?:"([^"]+)"|([\w$]+))/gi)) {
      const nameParts = match[1].replaceAll('"', '').split('.');
      const schema = nameParts.length === 2 ? nameParts[0] : 'public';
      const name = nameParts.at(-1);
      const key = `${schema}.${name}`;
      const table = tables.get(key) || { schema, name, columns: new Set() };
      table.columns.add(match[2] || match[3]);
      tables.set(key, table);
    }
  }
  return {
    tables: [...tables.values()].map(({ schema, name, columns }) => ({ schema, name, columns: [...columns] })),
    policies: [...policies.values()],
    functions: [...functions.values()],
  };
}

export async function readRepoMigrationVersions(migrationsDirectory) {
  const sqlFiles = (await readdir(migrationsDirectory)).filter((file) => file.toLowerCase().endsWith('.sql')).sort();
  const unversioned = sqlFiles.filter((file) => !/^\d{14}_.+\.sql$/.test(file));
  if (unversioned.length) throw new Error(`Unversioned SQL migration files cannot be omitted from the snapshot comparison: ${unversioned.join(', ')}.`);
  if (!sqlFiles.length) throw new Error(`No timestamped SQL migrations found in ${migrationsDirectory}.`);
  return sqlFiles.map((file) => file.slice(0, 14));
}

export async function readRepoMigrationContracts(migrationsDirectory) {
  const files = (await readdir(migrationsDirectory)).filter((file) => /^\d{14}_.+\.sql$/i.test(file)).sort();
  return extractMigrationSchemaContracts(await Promise.all(files.map(async (file) => ({
    file,
    sql: await readFile(join(migrationsDirectory, file), 'utf8'),
  }))));
}

function canonicalText(bytes) {
  return bytes.toString('utf8').replace(/\r\n/g, '\n');
}

export function calculateSnapshotSha256(bytes) {
  return createHash('sha256').update(canonicalText(bytes)).digest('hex');
}

export async function calculateMigrationTreeSha256(migrationsDirectory) {
  const files = (await readdir(migrationsDirectory)).filter((file) => file.toLowerCase().endsWith('.sql')).sort();
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update('\0');
    hash.update(canonicalText(await readFile(join(migrationsDirectory, file))));
    hash.update('\0');
  }
  return hash.digest('hex');
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const snapshotPath = process.env.STAGING_SCHEMA_SNAPSHOT || join(root, 'supabase/schema-snapshots/stavbacore-staging-20261030.json');
  const snapshotBytes = await readFile(snapshotPath);
  const snapshot = JSON.parse(snapshotBytes.toString('utf8'));
  const migrationsDirectory = join(root, 'supabase/migrations');
  const expectedVersions = await readRepoMigrationVersions(migrationsDirectory);
  const contracts = await readRepoMigrationContracts(migrationsDirectory);
  const result = verifySchemaSnapshot(snapshot, expectedVersions, {
    stagingProjectRef: process.env.STAGING_SUPABASE_PROJECT_REF,
    productionProjectRef: process.env.PRODUCTION_SUPABASE_PROJECT_REF,
  }, contracts);
  const baseline = JSON.parse(await readFile(join(root, 'supabase/schema-snapshots/stavbacore-staging-known-drift.json'), 'utf8'));
  const checked = verifyDocumentedSchemaDrift(result, baseline, {
    snapshotSha256: calculateSnapshotSha256(snapshotBytes),
    migrationTreeSha256: await calculateMigrationTreeSha256(migrationsDirectory),
  });
  if (!checked.ok) {
    for (const error of checked.errors) console.error(`Schema snapshot drift: ${error}`);
    process.exitCode = 1;
    return;
  }
  if (checked.documentedDrift) {
    console.log(`Schema snapshot has ${checked.documentedDrift.length} reviewed, unchanged drift categories; repository migration SQL and snapshot content match the baseline.`);
  } else {
    console.log(`Schema snapshot matches ${expectedVersions.length} repository migrations and all ${contracts.tables.length} tables, ${contracts.policies.length} policies, and ${contracts.functions.length} functions declared in migration SQL.`);
  }
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Schema snapshot verification failed.');
    process.exitCode = 1;
  });
}
