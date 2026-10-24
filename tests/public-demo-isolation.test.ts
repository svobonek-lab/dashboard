import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const workspace = readFileSync(new URL('../src/pages/public/demo/ui/PublicDemoWorkspace.tsx', import.meta.url), 'utf8');
const state = readFileSync(new URL('../src/features/public-demo/model/demoState.ts', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const ownerLayout = readFileSync(new URL('../src/widgets/workspace-shell/ui/OwnerLayout.tsx', import.meta.url), 'utf8');
const ownerDashboard = readFileSync(new URL('../src/widgets/owner-dashboard/ui/OwnerDashboard.tsx', import.meta.url), 'utf8');
const kanban = readFileSync(new URL('../src/features/manage-leads/ui/LeadsKanban.tsx', import.meta.url), 'utf8');
const companySwitcher = readFileSync(new URL('../src/widgets/company-switcher/ui/CompanySwitcher.tsx', import.meta.url), 'utf8');

test('public demo is static, read-only and sourced from the shared demo fixture', () => {
  assert.match(state, /PUBLIC_DEMO_LEADS/);
  assert.match(workspace, /pouze pro čtení/i);
  assert.match(workspace, /OwnerLayout/);
  assert.match(workspace, /OwnerDashboard/);
  assert.match(workspace, /LeadsKanban/);
  assert.match(workspace, /readOnly/);
  assert.match(ownerDashboard, /!readOnly &&/);
  assert.doesNotMatch(workspace, /localStorage|createDemoLead|moveDemoLead|setLeads|saveCompany/);
  assert.doesNotMatch(workspace, /owner-demo|od-banner|od-board/);
});

test('demo dispatch happens before authenticated application modules are loaded', () => {
  assert.match(main, /isPublicDemoPath/);
  assert.ok(main.indexOf('if (isPublicDemo') < main.indexOf("import('./App.tsx')"));
});

test('production UI reused by public demo imports only the lightweight context boundary', () => {
  for (const source of [workspace, ownerLayout, ownerDashboard, companySwitcher]) {
    assert.match(source, /OrganizationContextBase/);
    assert.doesNotMatch(source, /context\/OrganizationContext['"]/);
  }
  assert.doesNotMatch(kanban, /context\/OrganizationContext/);
});
