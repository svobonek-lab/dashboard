import { expect, test } from 'playwright/test';
import { signIn, stagingConfig } from './support';

test('owner navigation exposes only the verified owner pilot routes', async ({ page }) => {
  stagingConfig();
  await signIn(page, 'OWNER_A');

  await expect(page).toHaveURL(/\/dashboard$/);
  const landing = await page.locator('body').innerText();
  const state = landing.includes('Předplatné vypršelo') ? 'subscription-blocked'
    : landing.includes('Přístup pozastaven') ? 'company-suspended'
      : landing.includes('nemá aktivní členství') ? 'no-active-membership'
        : 'workspace';
  console.info(`Owner menu precondition: ${state}`);
  console.info(`Owner navigation items rendered: ${await page.locator('nav a').count()}`);
  await expect(page.getByRole('link', { name: 'Poptávky & Kanban' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Integrace & Datový Hub' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Prodejní cockpit|Sales/ })).toHaveCount(0);
});
