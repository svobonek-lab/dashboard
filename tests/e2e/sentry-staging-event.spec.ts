import { expect, test } from 'playwright/test';
import { requiredValue, signIn, stagingConfig } from './support';

function readSentryEvent(envelope: string): Record<string, unknown> | null {
  const lines = envelope.split(/\r?\n/);
  for (let index = 1; index < lines.length - 1; index += 1) {
    try {
      const header = JSON.parse(lines[index]) as { type?: unknown };
      if (header.type !== 'event') continue;
      const event = JSON.parse(lines[index + 1]) as Record<string, unknown>;
      return event;
    } catch {
      continue;
    }
  }
  return null;
}

test('staging Sentry receives only synthetic exception with company and role tags', async ({ page }) => {
  stagingConfig();
  const companyId = requiredValue('STAGING_COMPANY_A_ID');
  const ownerEmail = requiredValue('STAGING_OWNER_A_EMAIL');
  const sentryEvents: Array<Record<string, unknown>> = [];
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!/sentry\.io$/i.test(url.hostname) || !url.pathname.includes('/envelope/')) return;
    const event = readSentryEvent(request.postData() || '');
    if (event) sentryEvents.push(event);
  });
  await page.route('**/e2e-sentry-trigger.js', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: "setTimeout(() => { throw new Error('StavbaFlow synthetic Sentry staging acceptance'); }, 0);",
  }));

  await signIn(page, 'OWNER_A');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('nav a').first()).toBeVisible();

  const sentryResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return /sentry\.io$/i.test(url.hostname) && url.pathname.includes('/envelope/');
  }, { timeout: 20_000 });
  await page.addScriptTag({ url: new URL('/e2e-sentry-trigger.js', page.url()).href });
  const response = await sentryResponse;
  expect([200, 202]).toContain(response.status());

  const event = sentryEvents.find((candidate) => JSON.stringify(candidate).includes('StavbaFlow synthetic Sentry staging acceptance'));
  expect(event, 'Sentry envelope did not contain the synthetic event.').toBeDefined();
  expect(event?.tags).toEqual({ company_id: companyId, role: 'owner' });
  const userContext = event?.user as Record<string, unknown> | undefined;
  expect(userContext?.email).toBeUndefined();
  expect(userContext?.username).toBeUndefined();
  expect(userContext?.name).toBeUndefined();
  expect(JSON.stringify(event)).not.toContain(ownerEmail);
  expect(JSON.stringify(event)).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
});
