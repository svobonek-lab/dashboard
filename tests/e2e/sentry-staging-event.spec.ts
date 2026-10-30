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
  let sentryInitializationSeen = false;
  const sentryRequestFailures: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'log' && message.text().includes('Sentry úspěšně inicializováno.')) sentryInitializationSeen = true;
  });
  page.on('request', (request) => {
    const url = new URL(request.url());
    if (!/sentry\.io$/i.test(url.hostname) || !url.pathname.includes('/envelope/')) return;
    const event = readSentryEvent(request.postData() || '');
    if (event) sentryEvents.push(event);
  });
  page.on('requestfailed', (request) => {
    const url = new URL(request.url());
    if (/sentry\.io$/i.test(url.hostname) && url.pathname.includes('/envelope/')) {
      sentryRequestFailures.push(`${url.hostname}${url.pathname}: ${request.failure()?.errorText || 'unknown failure'}`);
    }
  });
  await page.route('**/e2e-sentry-trigger.js', (route) => route.fulfill({
    status: 200,
    contentType: 'application/javascript',
    body: "setTimeout(() => { throw new Error('StavbaFlow synthetic Sentry staging acceptance'); }, 0);",
  }));

  await signIn(page, 'OWNER_A');
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.locator('nav a').first()).toBeVisible();
  expect(sentryInitializationSeen, 'Sentry SDK did not initialize; check that the staging Preview has a non-empty VITE_SENTRY_DSN.').toBe(true);

  const syntheticError = 'StavbaFlow synthetic Sentry staging acceptance';
  const pageError = page.waitForEvent('pageerror', { timeout: 5_000 });

  const sentryResponse = page.waitForResponse((response) => {
    const url = new URL(response.url());
    if (!/sentry\.io$/i.test(url.hostname) || !url.pathname.includes('/envelope/')) return false;
    const event = readSentryEvent(response.request().postData() || '');
    return event != null && JSON.stringify(event).includes(syntheticError);
  }, { timeout: 20_000 });
  await page.addScriptTag({ url: new URL('/e2e-sentry-trigger.js', page.url()).href });
  const capturedPageError = await pageError;
  expect(capturedPageError.message).toContain(syntheticError);
  const response = await sentryResponse.catch((error) => {
    throw new Error(`${error instanceof Error ? error.message : 'Sentry event timed out'}; request failures: ${sentryRequestFailures.join(', ') || 'none observed'}`);
  });
  if (![200, 202].includes(response.status())) {
    const body = (await response.text()).toLowerCase();
    const reason = ['invalid origin', 'rate limit', 'quota', 'disabled', 'invalid key', 'forbidden']
      .find((candidate) => body.includes(candidate)) || 'unclassified';
    const safeBody = body
      .replace(/https?:\/\/\S+/g, '[url]')
      .replace(/[a-z0-9_-]{24,}/g, '[redacted]')
      .replace(/[^a-z0-9 ._:[\]{}"-]/g, ' ')
      .slice(0, 120);
    throw new Error(`Synthetic Sentry event was rejected: HTTP ${response.status()}, reason ${reason}, response ${safeBody}`);
  }

  const event = sentryEvents.find((candidate) => JSON.stringify(candidate).includes(syntheticError));
  expect(event, 'Sentry envelope did not contain the synthetic event.').toBeDefined();
  expect(event?.tags).toEqual({ company_id: companyId, role: 'owner' });
  const userContext = event?.user as Record<string, unknown> | undefined;
  expect(userContext?.email).toBeUndefined();
  expect(userContext?.username).toBeUndefined();
  expect(userContext?.name).toBeUndefined();
  expect(JSON.stringify(event)).not.toContain(ownerEmail);
  expect(JSON.stringify(event)).not.toMatch(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
});
