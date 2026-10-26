import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const baseUrl = 'http://127.0.0.1:4175';
const vite = spawn(process.execPath, ['node_modules/vite/bin/vite.js', '--host', '127.0.0.1', '--port', '4175', '--strictPort'], {
  cwd: root,
  env: {
    ...process.env,
    VITE_SUPABASE_URL: 'https://admin-ui-e2e.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'synthetic-playwright-key',
  },
  stdio: 'ignore',
});

let browser;
try {
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try {
      const response = await fetch(`${baseUrl}/tests/fixtures/admin-companies-preview.html`);
      if (response.ok) { ready = true; break; }
    } catch { /* local Vite server is still starting */ }
    await delay(250);
  }
  assert.equal(ready, true, 'local Vite test fixture did not start');

  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 375, height: 667 } });
  const projectRef = new URL('https://admin-ui-e2e.supabase.co').hostname.split('.')[0];
  await context.addInitScript((storageKey) => {
    localStorage.setItem(storageKey, JSON.stringify({
      access_token: 'synthetic-platform-admin-token',
      token_type: 'bearer',
      expires_in: 3600,
      expires_at: Math.floor(Date.now() / 1000) + 3600,
      refresh_token: 'synthetic-refresh-token',
      user: { id: 'synthetic-platform-admin', aud: 'authenticated', role: 'authenticated', email: 'platform-admin@example.invalid' },
    }));
  }, `sb-${projectRef}-auth-token`);

  const page = await context.newPage();
  let mutations = 0;
  await page.route('**/api/platform/companies', async (route) => {
    if (route.request().method() !== 'GET') {
      mutations += 1;
      await route.fulfill({ status: 405, contentType: 'application/json', body: JSON.stringify({ error: 'read-only fixture' }) });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ companies: [{
        id: 'synthetic-company-1', name: 'Stavební společnost Novák a synové s dlouhým názvem s.r.o.',
        slug: 'novak-a-synove', active: true, onboarding_completed: false,
        created_at: '2026-01-01T00:00:00.000Z', member_count: 3, plan: 'pilot',
        subscription_status: 'pilot', integration_status: 'not_verified',
        invitation_status: 'sent', first_lead_at: null,
      }] }),
    });
  });

  await page.goto(`${baseUrl}/tests/fixtures/admin-companies-preview.html`);
  const cards = page.getByTestId('admin-company-cards');
  await cards.waitFor({ state: 'visible' });
  assert.equal(await page.getByTestId('admin-company-table').isVisible(), false);
  assert.equal(await cards.getByText('3', { exact: true }).count(), 1);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, '375px viewport must not overflow horizontally');

  await page.getByRole('button', { name: 'Nová firma' }).click();
  const newCompanyDialog = page.getByTestId('new-company-modal');
  await newCompanyDialog.waitFor({ state: 'visible' });
  const scrollsInternally = await newCompanyDialog.evaluate((element) => element.scrollHeight > element.clientHeight);
  assert.equal(scrollsInternally, true, 'new-company dialog must scroll internally on a small viewport');
  await newCompanyDialog.getByRole('button', { name: 'Zrušit' }).click();
  assert.equal(mutations, 0, 'viewport check must not submit a company mutation');

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.reload();
  await page.getByTestId('admin-company-table').waitFor({ state: 'visible' });
  assert.equal(await cards.isVisible(), false);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), true, '1280px viewport must not overflow horizontally');
  assert.equal(mutations, 0);
  console.log('PASS: admin company directory at 375px and 1280px; no API writes');
} finally {
  await browser?.close();
  vite.kill();
}
