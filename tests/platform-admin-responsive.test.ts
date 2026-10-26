import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const companies = readFileSync(new URL('../src/pages/admin/companies/ui/Companies.tsx', import.meta.url), 'utf8');
const layout = readFileSync(new URL('../src/widgets/workspace-shell/ui/SuperAdminLayout.tsx', import.meta.url), 'utf8');
const e2e = readFileSync(new URL('../scripts/admin-company-directory-e2e.mjs', import.meta.url), 'utf8');

test('admin directory switches to company cards on mobile and keeps the desktop table', () => {
  assert.match(companies, /data-testid="admin-company-cards"[^>]*className="[^"]*md:hidden/);
  assert.match(companies, /data-testid="admin-company-table"[^>]*className="hidden[^\"]*md:block/);
  for (const field of ['Firma', 'Onboarding', 'Uživatelé', 'Tarif']) assert.match(companies, new RegExp(field));
  assert.match(companies, /grid-cols-2 gap-2/);
});

test('admin modals stay within the viewport and scroll internally', () => {
  assert.match(companies, /data-testid="new-company-modal"[^>]*className="[^"]*max-h-\[calc\(100dvh-2rem\)\][^"]*overflow-y-auto/);
  assert.match(companies, /data-testid="support-session-modal"[^>]*className="[^"]*max-h-\[calc\(100dvh-2rem\)\][^"]*overflow-y-auto/);
});

test('admin mobile header hides secondary text and truncates the current route', () => {
  assert.match(layout, /Control plane[^<]*<\/span>/);
  assert.match(layout, /hidden[^\"]*sm:inline[^>]*>Control plane/);
  assert.match(layout, /max-w-\[120px\] truncate/);
});

test('Playwright viewport check covers 375px and 1280px without submitting actions', () => {
  assert.match(e2e, /width:\s*375/);
  assert.match(e2e, /width:\s*1280/);
  assert.match(e2e, /admin-company-cards/);
  assert.match(e2e, /admin-company-table/);
  assert.match(e2e, /scrollWidth/);
});
