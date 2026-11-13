import { expect, test } from 'playwright/test';

const landing = 'http://127.0.0.1:4177';
const app = 'http://127.0.0.1:4178';

test.beforeEach(async ({ page }) => {
  await page.route('https://sales-test.invalid/**', route => route.abort());
});

for (const width of [390, 1440]) {
  test(`sales CTA destinations and demo return at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(landing);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Interaktivní demo' }).click();
    await expect(page).toHaveURL(`${app}/demo`);
    await expect(page.getByText('Veřejné demo · pouze syntetická data · pouze pro čtení')).toBeVisible();
    await page.getByRole('link', { name: 'Zpět na web' }).click();
    await expect(page).toHaveURL(`${landing}/`);
    await page.getByRole('button', { name: 'Přihlásit se' }).click();
    await expect(page).toHaveURL(`${app}/login`);
    await expect(page.getByRole('heading', { name: /Přihlášení/ })).toBeVisible();
    await page.goto(`${landing}/register-paid`);
    await expect(page.getByRole('heading', { name: 'Registrace zde není dostupná' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Založit firmu' })).toHaveCount(0);
  });
}

for (const [name, origin] of [['missing', 'http://127.0.0.1:4179'], ['invalid', 'http://127.0.0.1:4180']] as const) {
  test(`${name} app URL fails closed on sales surface`, async ({ page }) => {
    await page.goto(origin);
    await expect(page.getByRole('button', { name: 'Interaktivní demo' })).toBeDisabled();
    await page.getByRole('button', { name: 'Přihlásit se' }).click();
    await expect(page).toHaveURL(`${origin}/login`);
    await expect(page.getByRole('heading', { name: 'Přihlášení teď není dostupné' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Založit firmu' })).toHaveCount(0);
  });
}
