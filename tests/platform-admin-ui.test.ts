import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

const layout = readFileSync(new URL('../src/layouts/SuperAdminLayout.tsx', import.meta.url), 'utf8');
const dashboard = readFileSync(new URL('../src/pages/admin/Dashboard.tsx', import.meta.url), 'utf8');
const companies = readFileSync(new URL('../src/pages/admin/Companies.tsx', import.meta.url), 'utf8');
const app = readFileSync(new URL('../src/App.tsx', import.meta.url), 'utf8');

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

test('platform pages contain no fabricated revenue, telemetry or tenant impersonation', () => {
  const source = `${dashboard}\n${companies}`;
  assert.doesNotMatch(source, /totalMRR|2490|99\.99|18ms|Live Feed/i);
  assert.doesNotMatch(source, /impersonateOrganization|Open Workspace|Otevřít Company Workspace/i);
  assert.match(source, /not_verified|Neověřeno/i);
  assert.match(source, /read-only|pouze pro čtení/i);
});

test('company directory never asks the browser for customer contacts or business rows', () => {
  assert.doesNotMatch(companies, /lead_count|org\.email|org\.phone|org\.address|org\.website/i);
  assert.match(companies, /listPlatformCompanies/);
});
