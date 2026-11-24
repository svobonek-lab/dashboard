import assert from 'node:assert/strict';
import { writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';
import { assertPreviewSupabaseTarget } from './assert-preview-supabase-target.mjs';

const { STAGING_PREVIEW_URL: preview, STAGING_SENTRY_PROJECT_ID: projectId, SENTRY_DRILL_ID: drillId,
  SENTRY_DRILL_RECEIPT: receipt } = process.env;
assert.match(preview || '', /^https:\/\/dashboard-[a-z0-9-]+\.vercel\.app$/);
assert.match(projectId || '', /^\d+$/);
assert.match(drillId || '', /^[\da-f-]{36}$/);
assert.ok(receipt, 'Supply a receipt path outside the repository and reuse it if the outcome is uncertain');
await assertPreviewSupabaseTarget(preview, 'xwzweltjvreqhjpbjrxa', 'oncmtmrhmjlerbwkrecv');

const message = `StavbaFlow synthetic staging alert drill ${drillId}`;
const browser = await chromium.launch();
try {
  const page = await browser.newPage();
  let sent = false;
  let eventId;
  await page.route(/https:\/\/[^/]+\.sentry\.io\/api\//, async route => {
    const request = route.request();
    const url = new URL(request.url());
    const payload = request.postData() || '';
    if (sent || url.pathname !== `/api/${projectId}/envelope/` || !payload.includes(message)) return route.abort();
    const event = payload.split(/\r?\n/).flatMap(line => {
      try { return [JSON.parse(line)]; } catch { return []; }
    }).find(item => item.exception && item.event_id);
    if (!event || event.environment !== 'staging' || event.user || /[\w.+-]+@[\w.-]+\.[a-z]{2,}/i.test(JSON.stringify(event))) {
      return route.abort();
    }
    if (!/^[a-f\d]{32}$/.test(event.event_id)) return route.abort();
    sent = true;
    eventId = event.event_id;
    // Persist the intent before the first provider request to protect against retries with an uncertain outcome.
    await writeFile(receipt, JSON.stringify({ drillId, eventId, preview, projectId, environment: event.environment,
      attemptAt: new Date().toISOString() }), { flag: 'wx', mode: 0o600 });
    return route.continue();
  });
  await page.goto(`${preview}/login`);
  await page.getByRole('heading', { name: 'Přihlášení do StavbaFlow' }).waitFor();
  const response = page.waitForResponse(result => result.request().postData()?.includes(message) && result.url().includes('/envelope/'),
    { timeout: 15_000 });
  await page.evaluate(value => setTimeout(() => { throw new Error(value); }, 0), message);
  const result = await response;
  assert.ok([200, 202].includes(result.status()));
  assert.ok(eventId);
  console.log(JSON.stringify({ drillId, eventId, preview, projectId, environment: 'staging', ingestHttp: result.status() }));
} finally {
  await browser.close();
}
