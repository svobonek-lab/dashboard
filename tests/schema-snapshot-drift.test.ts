import assert from 'node:assert/strict';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { extractMigrationSchemaContracts, readRepoMigrationVersions, verifySchemaSnapshot } from '../scripts/verify-schema-snapshot.mjs';

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

test('schema snapshot verification accepts the normalized metadata object returned by the read-only capture', () => {
  const normalized = { ...snapshot, database: snapshot.database[0].metadata };
  const result = verifySchemaSnapshot(normalized, ['20260901000000'], {
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

test('schema snapshot verification rejects migration objects missing from otherwise matching metadata', () => {
  const contracts = {
    tables: [{ schema: 'public', name: 'app_companies', columns: ['id', 'name'] }],
    policies: [{ schema: 'public', table: 'app_companies', name: 'company_read' }],
    functions: [{ schema: 'public', name: 'app_active_company' }],
  };
  const complete = {
    ...snapshot,
    database: [{ metadata: {
      ...snapshot.database[0].metadata,
      columns: [
        { schema: 'public', table: 'app_companies', name: 'id' },
        { schema: 'public', table: 'app_companies', name: 'name' },
      ],
      policies: [{ schema: 'public', table: 'app_companies', name: 'company_read' }],
      functions: [{ schema: 'public', name: 'app_active_company' }],
    } }],
  };
  const args = { stagingProjectRef: 'bbbbbbbbbbbbbbbbbbbb', productionProjectRef: 'aaaaaaaaaaaaaaaaaaaa' };
  assert.deepEqual(verifySchemaSnapshot(complete, ['20260901000000'], args, contracts), { ok: true, errors: [] });

  for (const metadata of [
    { ...complete.database[0].metadata, relations: [] },
    { ...complete.database[0].metadata, columns: [{ schema: 'public', table: 'app_companies', name: 'id' }] },
    { ...complete.database[0].metadata, policies: [] },
    { ...complete.database[0].metadata, functions: [] },
  ]) {
    const result = verifySchemaSnapshot({ ...complete, database: [{ metadata }] }, ['20260901000000'], args, contracts);
    assert.equal(result.ok, false);
    assert.match(result.errors.join('\n'), /migration schema objects absent/i);
  }
});

test('migration SQL inventory captures declared objects and ignores dynamic SQL bodies and constraints', () => {
  const contracts = extractMigrationSchemaContracts([{ file: 'fixture.sql', sql: `
    CREATE TABLE public.example (id uuid, value text, CONSTRAINT example_pk PRIMARY KEY (id));
    ALTER TABLE public.example ADD COLUMN IF NOT EXISTS added_at timestamptz;
    CREATE POLICY "read example" ON public.example FOR SELECT USING (true);
    CREATE OR REPLACE FUNCTION public.example_fn() RETURNS boolean LANGUAGE sql AS $$ SELECT true $$;
    DO $$ BEGIN EXECUTE 'CREATE POLICY fake ON public.other USING (true)'; END $$;
    DO $boundaries$ BEGIN
      FOREACH t IN ARRAY ARRAY['app_alpha','app_beta'] LOOP
        EXECUTE format('CREATE POLICY app_jwt_tenant_boundary ON public.%I USING (true)', t);
      END LOOP;
    END $boundaries$;
  ` }]);
  assert.deepEqual(contracts.tables, [{ schema: 'public', name: 'example', columns: ['id', 'value', 'added_at'] }]);
  assert.deepEqual(contracts.policies, [
    { schema: 'public', table: 'example', name: 'read example' },
    { schema: 'public', table: 'app_alpha', name: 'app_jwt_tenant_boundary' },
    { schema: 'public', table: 'app_beta', name: 'app_jwt_tenant_boundary' },
  ]);
  assert.deepEqual(contracts.functions, [{ schema: 'public', name: 'example_fn' }]);
});
