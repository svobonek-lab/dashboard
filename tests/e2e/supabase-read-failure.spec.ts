import { expect, test } from 'playwright/test';
import { signIn, stagingConfig } from './support';

test('authenticated routes show a readable error when Supabase data reads fail', async ({ page }) => {
  const { url } = stagingConfig();
  let interceptedReads = 0;

  await page.route((requestUrl) => {
    const request = new URL(requestUrl);
    return request.origin === url && request.pathname === '/rest/v1/app_leads';
  }, async (route) => {
    if (route.request().method() !== 'GET') return route.continue();
    interceptedReads += 1;
    await route.fulfill({
      status: 503,
      contentType: 'application/json',
      body: JSON.stringify({ code: 'E2E_SYNTHETIC_FAILURE', message: 'Synthetic staging outage' }),
    });
  });

  await signIn(page, 'OWNER_A');

  await expect(page.getByRole('heading', { name: 'Data se nepodařilo načíst' })).toBeVisible();
  await expect(page.getByText('Zakázky a zaměstnance se nepodařilo načíst. Zkontrolujte připojení a zkuste stránku obnovit.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Zkusit znovu' })).toBeVisible();
  expect(interceptedReads).toBeGreaterThan(0);
});
