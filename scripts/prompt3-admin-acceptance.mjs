import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createClient } from '@supabase/supabase-js';
import { chromium } from 'playwright';

const stagingUrl = 'https://xwzweltjvreqhjpbjrxa.supabase.co';
const previewUrl = 'https://dashboard-git-codex-staging-e2e-79cdb9-svobonek-6462s-projects.vercel.app';
assert.equal(process.env.STAGING_SUPABASE_URL, stagingUrl, 'Refusing admin fixture outside staging Supabase.');
assert.equal(process.env.STAGING_SUPABASE_PROJECT_REF, 'xwzweltjvreqhjpbjrxa');
assert.equal(process.env.PRODUCTION_SUPABASE_PROJECT_REF, 'oncmtmrhmjlerbwkrecv');
assert.equal(process.env.STAGING_PREVIEW_URL, previewUrl, 'Refusing admin browser outside the exact staging Preview alias.');
const serviceKey = process.env.STAGING_SUPABASE_SERVICE_ROLE_KEY;
assert.ok(serviceKey, 'Missing staging service key.');
const service = createClient(stagingUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });
const email = `prompt3-admin-${randomUUID()}@stavbaflow.example.test`;
const password = randomBytes(32).toString('base64url');
let userId = '';
let browser;
try {
  const created = await service.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { name: 'Prompt 3 Synthetic Admin' } });
  if (created.error || !created.data.user) throw new Error('Staging synthetic admin Auth creation failed.');
  userId = created.data.user.id;
  const inserted = await service.from('app_platform_admins').insert({ user_id: userId, active: true, notes: 'Prompt 3 temporary synthetic admin' });
  if (inserted.error) throw new Error('Staging synthetic platform role creation failed.');

  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ baseURL: previewUrl, viewport: { width: 390, height: 800 } });
  await page.goto('/login');
  await page.getByPlaceholder('jmeno@firma.cz').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Přihlásit se' }).click();
  await page.waitForURL((url) => url.pathname.startsWith('/admin'), { timeout: 20_000 });
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    await page.goto('/admin/companies');
    await page.getByRole('heading', { name: 'Zákaznické firmy' }).waitFor({ state: 'visible' });
    await page.getByTestId(width === 390 ? 'admin-company-cards' : 'admin-company-table').waitFor({ state: 'visible' });
    await (width === 390
      ? page.getByTestId('admin-company-card').first()
      : page.getByTestId('admin-company-table').locator('tbody tr').first()).waitFor({ state: 'visible', timeout: 15_000 });
    assert.equal(await page.locator('[role="alert"]').count(), 0, 'Admin directory showed an API error.');
    const count = width === 390
      ? await page.getByTestId('admin-company-card').count()
      : await page.getByTestId('admin-company-table').locator('tbody tr').count();
    assert.ok(count >= 2, `Admin directory did not load both synthetic companies at ${width}px.`);
    const metrics = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.documentElement.scrollWidth }));
    assert.ok(metrics.page <= metrics.viewport + 1, `Admin directory overflows at ${width}px.`);
    console.info(`Prompt 3 authenticated admin directory passed at ${width}px; companies=${count}; horizontalOverflow=0.`);
  }
  await page.close();
} finally {
  if (browser) await browser.close();
  if (userId) {
    const roleDelete = await service.from('app_platform_admins').delete().eq('user_id', userId);
    const authDelete = await service.auth.admin.deleteUser(userId);
    if (roleDelete.error || authDelete.error) throw new Error('Synthetic admin cleanup failed.');
    console.info('Prompt 3 synthetic admin role and Auth user removed.');
  }
}
