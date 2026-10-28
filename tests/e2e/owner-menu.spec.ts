import { expect, test } from 'playwright/test';
import { signIn, stagingConfig } from './support';

test('owner navigation exposes only the verified owner pilot routes', async ({ page }) => {
  stagingConfig();
  await signIn(page, 'OWNER_A');

  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('link', { name: 'Poptávky & Kanban' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Integrace & Datový Hub' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Prodejní cockpit|Sales/ })).toHaveCount(0);
});
