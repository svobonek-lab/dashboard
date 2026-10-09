import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const workspace = readFileSync(new URL('../features/publicDemo/PublicDemoWorkspace.tsx', import.meta.url), 'utf8');
const state = readFileSync(new URL('../features/publicDemo/demoState.ts', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');

test('public demo is static, read-only and sourced from the shared demo fixture', () => {
  assert.match(state, /PUBLIC_DEMO_LEADS/);
  assert.match(workspace, /pouze pro čtení/i);
  assert.doesNotMatch(workspace, /localStorage|createDemoLead|moveDemoLead|setLeads|saveCompany/);
});

test('demo dispatch happens before authenticated application modules are loaded', () => {
  assert.match(main, /isPublicDemoPath/);
  assert.ok(main.indexOf('if (isPublicDemo') < main.indexOf("import('./App.tsx')"));
});
