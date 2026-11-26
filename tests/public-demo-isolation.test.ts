import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const workspace = readFileSync(new URL('../src/pages/public/demo/ui/PublicDemoWorkspace.tsx', import.meta.url), 'utf8');
const shell = readFileSync(new URL('../src/pages/public/demo/ui/DemoShell.tsx', import.meta.url), 'utf8');
const notes = readFileSync(new URL('../src/pages/public/demo/ui/DemoNotes.tsx', import.meta.url), 'utf8');
const demoModel = readFileSync(new URL('../src/features/public-demo/model/demoWorkspace.ts', import.meta.url), 'utf8');
const state = readFileSync(new URL('../src/features/public-demo/model/demoState.ts', import.meta.url), 'utf8');
const main = readFileSync(new URL('../src/main.tsx', import.meta.url), 'utf8');
const appStartup = readFileSync(new URL('../src/app/startApplication.tsx', import.meta.url), 'utf8');
const ownerLayout = readFileSync(new URL('../src/widgets/workspace-shell/ui/OwnerLayout.tsx', import.meta.url), 'utf8');
const ownerDashboard = readFileSync(new URL('../src/widgets/owner-dashboard/ui/OwnerDashboard.tsx', import.meta.url), 'utf8');
const kanban = readFileSync(new URL('../src/features/manage-leads/ui/LeadsKanban.tsx', import.meta.url), 'utf8');
const companySwitcher = readFileSync(new URL('../src/widgets/company-switcher/ui/CompanySwitcher.tsx', import.meta.url), 'utf8');

test('public demo is interactive but local-only and sourced from the shared demo fixture', () => {
  assert.match(state, /PUBLIC_DEMO_LEADS/);
  assert.match(demoModel, /PUBLIC_DEMO_LEADS\.map/);
  assert.match(workspace, /createPublicDemoLeads/);
  assert.match(workspace, /aria-label="Public demo"/);
  assert.match(workspace, /OwnerDashboard/);
  assert.match(workspace, /LeadsKanban/);
  assert.match(workspace, /LeadDetail/);
  assert.match(workspace, /změny se neukládají/i);
  assert.match(ownerDashboard, /!readOnly &&/);
  assert.doesNotMatch(workspace, /OwnerLayout/);
  assert.doesNotMatch(workspace, /owner-demo|od-banner|od-board/);
});

test('public demo changes live only in memory and never reach storage, the network or a backend', () => {
  for (const source of [workspace, shell, demoModel, notes]) {
    assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|fetch\(|XMLHttpRequest|sendBeacon|crmRepo|createClient|supabase\.(from|rpc|auth|storage)|saveCompany/);
  }
  // The notes and files section talks to the backend, so the demo detail screen must not render it.
  assert.match(workspace, /showDocuments=\{false\}/);
  assert.doesNotMatch(workspace, /DocumentsTab/);
  assert.match(workspace, /DemoNotes/);
  // Every context method that would persist or administer something stays rejected.
  for (const method of ['login', 'signUp', 'createOrganization', 'saveLead', 'createLead', 'updateLeadStatus', 'saveEmployee', 'inviteEmployee', 'saveProject', 'createCustomerAdmin']) {
    assert.match(workspace, new RegExp(`${method}: rejectDemoWrite`), `${method} must stay rejected`);
  }
});

test('demo dispatch happens before authenticated application modules are loaded', () => {
  assert.match(appStartup, /isPublicDemoPath/);
  assert.ok(appStartup.indexOf('if (isPublicDemo') < appStartup.indexOf("import('./App.tsx')"));
  assert.match(main, /startApplication/);
});

test('production UI reused by public demo imports only the session entity context boundary', () => {
  for (const source of [workspace, ownerLayout, ownerDashboard, companySwitcher]) {
    assert.match(source, /@\/entities\/session/);
    assert.doesNotMatch(source, /context\/OrganizationContext['"]/);
  }
  assert.doesNotMatch(kanban, /context\/OrganizationContext/);
});
