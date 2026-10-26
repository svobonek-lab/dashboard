import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { test } from 'node:test';

const root = process.cwd();

test('migration map accounts for every staging contract and every numbered migration', async () => {
  const map = await readFile(join(root, 'docs/migration-map.md'), 'utf8');
  const staged = await readdir(join(root, 'supabase/staging'));
  const migrations = await readdir(join(root, 'supabase/migrations'));

  for (const file of staged.filter((name) => name.endsWith('_contract.sql'))) {
    assert.ok(map.includes(file), `migration map is missing staging contract ${file}`);
  }

  for (const file of migrations.filter((name) => /^\d{14}_.+\.sql$/.test(name))) {
    assert.ok(map.includes(file), `migration map is missing numbered migration ${file}`);
  }

  assert.match(map, /Coverage: (?:full|partial|not covered|proposal only)/i);
  assert.match(map, /non-destructive consolidation order/i);
});
