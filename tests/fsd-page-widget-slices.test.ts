import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { test } from 'node:test';

const pageSlices = [
  'admin/companies', 'admin/dashboard', 'admin/support-session',
  'auth/login', 'auth/paid-registration',
  'employee/dashboard', 'employee/jobs', 'employee/photos', 'employee/schedule',
  'owner/billing-return', 'owner/dashboard', 'owner/employees', 'owner/integrations',
  'owner/leads', 'owner/pilot-unavailable', 'owner/projects', 'owner/settings', 'owner/widget',
  'public/demo', 'public/embed', 'public/iframe', 'public/landing', 'public/sales',
] as const;
const widgetSlices = [
  'sidebar', 'company-switcher', 'owner-dashboard', 'workspace-readiness',
  'weather', 'command-palette', 'workspace-shell',
] as const;

test('existing route pages and reusable UI expose FSD slice public APIs', () => {
  for (const slice of pageSlices) {
    const api = `src/pages/${slice}/index.ts`;
    assert.ok(existsSync(api), `Missing page public API: ${api}`);
  }
  for (const slice of widgetSlices) {
    const api = `src/widgets/${slice}/index.ts`;
    assert.ok(existsSync(api), `Missing widget public API: ${api}`);
  }
});
