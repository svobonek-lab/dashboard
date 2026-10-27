import { expect, test } from 'playwright/test';
import { requiredValue, signIn, stagingConfig } from './support';

test('logout removes tenant data caches without touching unrelated preferences', async ({ page }) => {
  stagingConfig();
  const companyA = requiredValue('STAGING_COMPANY_A_ID');
  const companyB = requiredValue('STAGING_COMPANY_B_ID');
  await signIn(page, 'OWNER_A');

  await page.evaluate(({ companyA, companyB }) => {
    localStorage.setItem(`stavbacore:v2:${companyA}:leads`, '[{"synthetic":true}]');
    localStorage.setItem(`stavbacore:v2:${companyA}:onboarding`, '{"synthetic":true}');
    localStorage.setItem(`stavbacore:v2:${companyB}:leads`, '[{"synthetic":true}]');
    localStorage.setItem('leads_cache_test', '[{"synthetic":true}]');
    localStorage.setItem('stavbaflow:e2e:unrelated-preference', 'keep');
  }, { companyA, companyB });

  await page.getByTitle('Odhlásit se').click();
  await page.waitForURL(/\/login$/);
  const remaining = await page.evaluate(() => Object.keys(localStorage));

  expect(remaining.some((key) => key.startsWith('stavbacore:'))).toBe(false);
  expect(remaining.some((key) => key.startsWith('leads_cache_'))).toBe(false);
  await expect.poll(() => page.evaluate(() => localStorage.getItem('stavbaflow:e2e:unrelated-preference'))).toBe('keep');
});
