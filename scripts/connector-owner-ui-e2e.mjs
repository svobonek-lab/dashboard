import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { assertIsolatedStagingProject } from './connector-staging-environment.mjs';

const { stagingProjectRef } = assertIsolatedStagingProject(process.env);
const previewUrl = new URL(process.env.STAGING_PREVIEW_URL || '');
const email = process.env.STAGING_OWNER_A_EMAIL;
const password = process.env.STAGING_OWNER_A_PASSWORD;
assert.equal(previewUrl.protocol, 'https:');
assert.ok(previewUrl.hostname.endsWith('.vercel.app'), 'Only a reviewed Vercel Preview is accepted.');
assert.ok(email && password, 'Missing synthetic staging owner credentials.');

const extraHTTPHeaders = process.env.STAGING_PREVIEW_BYPASS_TOKEN
  ? { 'x-vercel-protection-bypass': process.env.STAGING_PREVIEW_BYPASS_TOKEN }
  : {};
let browser;
let step = 'launch browser';

try {
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ extraHTTPHeaders });
  const page = await context.newPage();
  const authResponses = [];
  page.on('response', response => {
    try {
      const url = new URL(response.url());
      if (url.hostname.endsWith('.supabase.co') && url.pathname.startsWith('/auth/')) {
        authResponses.push({ path: url.pathname, status: response.status() });
      }
    } catch { /* Ignore malformed response URLs without recording their content. */ }
  });

  step = 'sign in with the synthetic staging owner';
  await page.goto(new URL('/login', previewUrl).toString(), { waitUntil: 'domcontentloaded' });
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Pokračovat do workspace' }).click();
  try {
    await page.waitForURL(url => url.pathname !== '/login', { timeout: 30_000 });
  } catch (error) {
    const alert = page.locator('.bg-rose-50').first();
    const alertText = await alert.innerText().catch(() => '');
    const loginAlert = alertText.toLowerCase().includes('nesprávný') ? 'INVALID_CREDENTIALS'
      : alertText.toLowerCase().includes('oprávnění') ? 'ROLE_MISMATCH'
        : alertText ? 'OTHER_LOGIN_ERROR' : 'NO_LOGIN_ERROR';
    throw new Error(`STAGING_LOGIN_TIMEOUT:${loginAlert}:${new URL(page.url()).pathname}:${JSON.stringify(authResponses)}`);
  }

  step = 'open the owner integrations page';
  await page.goto(new URL('/integrations', previewUrl).toString(), { waitUntil: 'domcontentloaded' });
  const connectButton = page.getByRole('button', { name: 'Připojit vlastní databázi' }).first();
  await connectButton.waitFor({ state: 'visible', timeout: 30_000 });

  step = 'open connector setup in one click';
  await connectButton.click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('heading', { name: 'Připojit databázi firmy' }).waitFor({ state: 'visible' });
  await dialog.getByText('Databáze na Synology').waitFor({ state: 'visible' });

  step = 'close connector setup without creating an enrollment';
  await dialog.getByRole('button', { name: 'Zavřít průvodce databází' }).click();
  await dialog.waitFor({ state: 'hidden' });

  step = 'download action gives a clear release-gate message';
  await page.getByRole('button', { name: 'Stáhnout Synology Docker Compose' }).click();
  await page.getByRole('alert').getByText('Stažení čeká na vydaný a ověřený neměnný image digest.').waitFor({ state: 'visible' });

  step = 'open field mapping without a connector';
  await page.getByRole('button', { name: 'Spravovat mapování polí' }).click();
  const mappingDialog = page.getByRole('dialog');
  await mappingDialog.getByRole('heading', { name: 'Mapování databázových polí' }).waitFor({ state: 'visible' });

  process.stdout.write(JSON.stringify({
    passed: true,
    environment: 'isolated-staging',
    stagingProjectRef,
    ownerSetupOpensInOneClick: true,
    composeActionExplainsMissingRelease: true,
    mappingActionOpens: true,
    enrollmentCreated: false,
  }) + '\n');
} catch (error) {
  const safeErrorCode = error instanceof Error
    && error.message.startsWith('STAGING_LOGIN_TIMEOUT:')
    ? error.message
    : error instanceof Error ? error.name : 'UnknownError';
  process.stderr.write(JSON.stringify({
    passed: false,
    environment: 'isolated-staging',
    step,
    errorType: safeErrorCode,
  }) + '\n');
  process.exitCode = 1;
} finally {
  await browser?.close();
}
