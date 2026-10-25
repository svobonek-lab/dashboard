import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import test from 'node:test';

const root = process.cwd();
const layers = ['app', 'pages', 'widgets', 'features', 'entities', 'shared'] as const;
const legacyBrowserRoots = ['components', 'features', 'hooks', 'context'];

function hasSource(path: string): boolean {
  if (!existsSync(path)) return false;
  return readdirSync(path, { withFileTypes: true }).some((entry) => {
    const target = join(path, entry.name);
    return entry.isDirectory() ? hasSource(target) : /\.(tsx?|jsx?)$/.test(entry.name);
  });
}

test('browser source has six FSD layers and no parallel legacy feature roots', () => {
  for (const layer of layers) {
    assert.ok(existsSync(join(root, 'src', layer)), `Missing FSD layer: src/${layer}`);
  }
  for (const legacyRoot of legacyBrowserRoots) {
    assert.equal(hasSource(join(root, legacyRoot)), false, `Legacy browser source remains under ${legacyRoot}/`);
  }
  assert.equal(existsSync(join(root, 'src', 'App.tsx')), false, 'App composition should live in src/app');
  assert.equal(hasSource(join(root, 'src', 'layouts')), false, 'Layouts should be composed from workspace-shell widget');
});
