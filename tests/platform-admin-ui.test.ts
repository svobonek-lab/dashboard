import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const layout = readFileSync(new URL('../src/widgets/workspace-shell/ui/SuperAdminLayout.tsx', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/pages/admin/dashboard/ui/Dashboard.tsx', import.meta.url), 'utf8');
const companies = readFileSync(new URL('../src/pages/admin/companies/ui/Companies.tsx', import.meta.url), 'utf8');
const support = readFileSync(new URL('../src/pages/admin/support-session/ui/SupportSession.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');
const ownerLayout = readFileSync(new URL('../src/widgets/workspace-shell/ui/OwnerLayout.tsx', import.meta.url), 'utf8');

test('reachable platform navigation contains only verified control-plane surfaces', () => {
  assert.match(layout, /StavbaFlow/);
  assert.match(layout, /Přehled platformy/);
  assert.match(layout, /Zákaznické firmy/);
  for (const unsupported of ['Billing & MRR', 'Custom Domains', 'Live Telemetry', 'AI Demo Creator']) {
    assert.doesNotMatch(layout, new RegExp(unsupported, 'i'));
  }
  for (const path of ['/admin/billing', '/admin/domains', '/admin/logs', '/admin/demo-creator']) {
    assert.doesNotMatch(app, new RegExp(path.replaceAll('/', '\\/')));
  }
});

test('platform pages contain no fabricated revenue, telemetry or customer auth impersonation', () => {
  const source = `${dashboard}\n${companies}\n${support}`;
  assert.doesNotMatch(source, /totalMRR|2490|99\.99|18ms|Live Feed/i);
  assert.doesNotMatch(source, /impersonateOrganization|Open Workspace|Otevřít Company Workspace/i);
  assert.match(source, /not_verified|Neověřeno/i);
  assert.match(source, /auditovan/i);
  assert.match(companies, /Přihlásit jako/);
  assert.match(companies, /Přihlásit jako podpora/);
  assert.match(companies, /Důvod podpory/);
  assert.match(companies, /member_count/);
  assert.match(companies, /subscription_status/);
  assert.match(support, /30 minut|expires_at/i);
  assert.match(support, /OwnerDashboard/);
  assert.match(support, /OwnerLeadsPage/);
  assert.match(support, /update_status/);
  assert.match(companies, /sessionStorage/);
  assert.match(companies, /\/support\/\$\{session\.id\}\/dashboard/);
  assert.match(support, /OwnerLayout/);
  assert.match(support, /Vrátit se do Adminu/);
  assert.match(ownerLayout, /readOnlyMode === 'support'[^]*supportBase/);
});

test('company directory never asks the browser for customer contacts or business rows', () => {
  assert.doesNotMatch(companies, /lead_count|org\.email|org\.phone|org\.address|org\.website/i);
  assert.match(companies, /listPlatformCompanies/);
});
