import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { readRepoMigrationVersions, verifySchemaSnapshot } from '../scripts/verify-schema-snapshot.mjs';

const snapshot = {
  projectRef: 'bbbbbbbbbbbbbbbbbbbb',
  productionProjectRef: 'aaaaaaaaaaaaaaaaaaaa',
  migrationHistory: { readable: true, versions: [{ version: '20260901000000' }] },
  database: [{ metadata: {
    captured_at_utc: '2026-10-28T00:00:00Z',
    relations: [{ schema: 'public', name: 'app_companies', relkind: 'r', rls_enabled: true }],
    columns: [{ schema: 'public', table: 'app_companies', name: 'id', data_type: 'uuid' }],
    policies: [], functions: [], storage: { buckets: [], policies: [] },
  } }],
};

test('schema snapshot verification rejects missing migration history rather than silently accepting stale metadata', () => {
  const result = verifySchemaSnapshot({ ...snapshot, migrationHistory: undefined }, ['20260901000000'], {
    stagingProjectRef: 'bbbbbbbbbbbbbbbbbbbb', productionProjectRef: 'aaaaaaaaaaaaaaaaaaaa',
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /migration history/i);
});

test('schema snapshot verification reports both unapplied repo migrations and unexpected staging versions', () => {
  const result = verifySchemaSnapshot(snapshot, ['20260902000000'], {
    stagingProjectRef: 'bbbbbbbbbbbbbbbbbbbb', productionProjectRef: 'aaaaaaaaaaaaaaaaaaaa',
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join('\n'), /20260902000000/);
  assert.match(result.errors.join('\n'), /20260901000000/);
});

test('schema snapshot verification accepts exact migration history and required metadata inventory', () => {
  const result = verifySchemaSnapshot(snapshot, ['20260901000000'], {
    stagingProjectRef: 'bbbbbbbbbbbbbbbbbbbb', productionProjectRef: 'aaaaaaaaaaaaaaaaaaaa',
  });
  assert.deepEqual(result, { ok: true, errors: [] });
});

test('schema snapshot verification refuses production or incomplete schema metadata', () => {
  const production = verifySchemaSnapshot(snapshot, ['20260901000000'], {
    stagingProjectRef: 'aaaaaaaaaaaaaaaaaaaa', productionProjectRef: 'aaaaaaaaaaaaaaaaaaaa',
  });
  assert.equal(production.ok, false);
  assert.match(production.errors.join('\n'), /production/i);

  const incomplete = verifySchemaSnapshot({ ...snapshot, database: [] }, ['20260901000000'], {
    stagingProjectRef: 'bbbbbbbbbbbbbbbbbbbb', productionProjectRef: 'aaaaaaaaaaaaaaaaaaaa',
  });
  assert.equal(incomplete.ok, false);
  assert.match(incomplete.errors.join('\n'), /metadata/i);
});

test('migration inventory refuses unversioned SQL files instead of omitting them from the snapshot comparison', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'schema-migrations-'));
  try {
    await writeFile(join(directory, '20261028000000_valid.sql'), '-- valid');
    await writeFile(join(directory, 'manual-change.sql'), '-- must not be skipped');
    await assert.rejects(readRepoMigrationVersions(directory), /unversioned SQL migration/i);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});
