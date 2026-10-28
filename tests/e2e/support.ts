import assert from 'node:assert/strict';
import type { APIRequestContext, Page } from 'playwright/test';
import { validateStagingPreview } from '../../scripts/validate-staging-preview.mjs';

export function stagingConfig() {
  const url = process.env.STAGING_SUPABASE_URL;
  const key = process.env.STAGING_SUPABASE_PUBLISHABLE_KEY;
  const preview = process.env.STAGING_PREVIEW_URL;
  const stagingRef = process.env.STAGING_SUPABASE_PROJECT_REF;
  const productionRef = process.env.PRODUCTION_SUPABASE_PROJECT_REF;
  const productionBaseUrl = process.env.PRODUCTION_BASE_URL;
  assert.ok(url && key && preview && stagingRef && productionRef && productionBaseUrl, 'Missing required isolated staging/production identity configuration.');
  assert.notEqual(stagingRef, productionRef, 'Refusing to run against the production Supabase project.');
  const safePreview = validateStagingPreview(preview, productionBaseUrl);
  assert.equal(new URL(url).protocol, 'https:');
  assert.equal(new URL(url).hostname, `${stagingRef}.supabase.co`, 'Staging Supabase URL must match the declared staging project ref.');
  return { url: url.replace(/\/$/, ''), key, preview: safePreview };
}

export function requiredValue(name: string): string {
  const value = process.env[name];
  assert.ok(value, `Missing staging fixture value ${name}.`);
  return value;
}

export async function signIn(page: Page, account: 'OWNER_A' | 'EMPLOYEE_A' | 'OWNER_B') {
  const email = requiredValue(`STAGING_${account}_EMAIL`);
  const password = requiredValue(`STAGING_${account}_PASSWORD`);
  await page.goto('/login');
  await page.getByPlaceholder('jmeno@firma.cz').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Pokračovat do workspace' }).click();
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 20_000 });
}

export async function accessToken(request: APIRequestContext, account: 'OWNER_A' | 'EMPLOYEE_A' | 'OWNER_B') {
  const { url, key } = stagingConfig();
  const email = requiredValue(`STAGING_${account}_EMAIL`);
  const password = requiredValue(`STAGING_${account}_PASSWORD`);
  const response = await request.post(`${url}/auth/v1/token?grant_type=password`, {
    headers: { apikey: key },
    data: { email, password },
  });
  assert.equal(response.ok(), true, `Staging Auth rejected ${account} credentials (HTTP ${response.status()}).`);
  const body = await response.json() as { access_token?: string };
  assert.ok(body.access_token, 'Staging Auth did not return an access token.');
  return body.access_token;
}

export async function restGet(request: APIRequestContext, token: string, table: string, query: string) {
  const { url, key } = stagingConfig();
  const response = await request.get(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  assert.equal(response.ok(), true, `Staging REST read of ${table} failed (HTTP ${response.status()}).`);
  return await response.json() as Array<Record<string, unknown>>;
}

export async function restPatch(request: APIRequestContext, token: string, table: string, query: string, body: Record<string, unknown>) {
  const { url, key } = stagingConfig();
  return request.patch(`${url}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      Prefer: 'return=representation',
      'Content-Type': 'application/json',
    },
    data: body,
  });
}

export async function restDelete(request: APIRequestContext, token: string, table: string, query: string) {
  const { url, key } = stagingConfig();
  return request.delete(`${url}/rest/v1/${table}?${query}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      Prefer: 'return=representation',
    },
  });
}
