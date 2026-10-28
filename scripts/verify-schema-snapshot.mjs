import { readdir, readFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export function verifySchemaSnapshot(snapshot, expectedVersions, { stagingProjectRef, productionProjectRef }) {
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
  const metadata = Array.isArray(databases) ? databases[0]?.metadata : null;
  if (!metadata || typeof metadata.captured_at_utc !== 'string'
    || !Array.isArray(metadata.relations) || !Array.isArray(metadata.columns)
    || !Array.isArray(metadata.policies) || !Array.isArray(metadata.functions)
    || !metadata.storage || !Array.isArray(metadata.storage.buckets) || !Array.isArray(metadata.storage.policies)) {
    errors.push('Schema snapshot lacks complete database, RLS, function, or Storage metadata.');
  }

  return { ok: errors.length === 0, errors };
}

export async function readRepoMigrationVersions(migrationsDirectory) {
  const sqlFiles = (await readdir(migrationsDirectory)).filter((file) => file.toLowerCase().endsWith('.sql')).sort();
  const unversioned = sqlFiles.filter((file) => !/^\d{14}_.+\.sql$/.test(file));
  if (unversioned.length) throw new Error(`Unversioned SQL migration files cannot be omitted from the snapshot comparison: ${unversioned.join(', ')}.`);
  if (!sqlFiles.length) throw new Error(`No timestamped SQL migrations found in ${migrationsDirectory}.`);
  return sqlFiles.map((file) => file.slice(0, 14));
}

async function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const snapshotPath = process.env.STAGING_SCHEMA_SNAPSHOT || join(root, 'supabase/schema-snapshots/stavbacore-staging-20261027.json');
  const snapshot = JSON.parse(await readFile(snapshotPath, 'utf8'));
  const expectedVersions = await readRepoMigrationVersions(join(root, 'supabase/migrations'));
  const result = verifySchemaSnapshot(snapshot, expectedVersions, {
    stagingProjectRef: process.env.STAGING_SUPABASE_PROJECT_REF,
    productionProjectRef: process.env.PRODUCTION_SUPABASE_PROJECT_REF,
  });
  if (!result.ok) {
    for (const error of result.errors) console.error(`Schema snapshot drift: ${error}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Schema snapshot matches ${expectedVersions.length} repository migrations and contains complete metadata.`);
}

if (process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url) {
  main().catch((error) => {
    console.error(error instanceof Error ? error.message : 'Schema snapshot verification failed.');
    process.exitCode = 1;
  });
}
