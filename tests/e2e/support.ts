import assert from 'node:assert/strict';
import type { APIRequestContext, Browser, Page } from 'playwright/test';
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

export async function accessToken(browser: Browser, account: 'OWNER_A' | 'EMPLOYEE_A' | 'OWNER_B') {
  const { preview } = stagingConfig();
  const context = await browser.newContext({ baseURL: preview });
  try {
    const page = await context.newPage();
    await signIn(page, account);
    const token = await page.evaluate(() => {
      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (!key?.endsWith('-auth-token')) continue;
        try {
          const session = JSON.parse(localStorage.getItem(key) ?? 'null') as { access_token?: unknown } | null;
          if (typeof session?.access_token === 'string') return session.access_token;
        } catch { /* Ignore unrelated local storage values. */ }
      }
      return null;
    });
    assert.ok(token, `Staging UI login for ${account} did not establish a Supabase session.`);
    return token;
  } finally {
    await context.close();
  }
}

export async function restGet(request: APIRequestContext, token: string, table: string, query: string) {
  const { url, key } = stagingConfig();
  const response = await request.get(`${url}/rest/v1/${table}?${query}`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  if (!response.ok()) {
    const body = await response.json().catch(() => null) as { code?: unknown; message?: unknown } | null;
    const rawCode = body?.code;
    const code = typeof rawCode === 'string' && /^[a-z0-9_.-]{1,64}$/i.test(rawCode) ? rawCode : 'unrecognized';
    const message = typeof body?.message === 'string' ? body.message.toLowerCase() : '';
    const reason = /api.?key/.test(message) ? 'API key rejected'
      : /jwt|token/.test(message) ? 'JWT rejected'
        : /permission|authorization/.test(message) ? 'authorization rejected'
          : 'unrecognized REST error';
    assert.fail(`Staging REST read of ${table} failed (HTTP ${response.status()}, ${code}, ${reason}).`);
  }
  return await response.json() as Array<Record<string, unknown>>;
}

export async function restInsert(request: APIRequestContext, token: string, table: string, body: Record<string, unknown>) {
  const { url, key } = stagingConfig();
  return request.post(`${url}/rest/v1/${table}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
      Prefer: 'return=representation',
      'Content-Type': 'application/json',
    },
    data: body,
  });
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

export async function restRpc(request: APIRequestContext, token: string, functionName: string, body: Record<string, unknown>) {
  const { url, key } = stagingConfig();
  return request.post(`${url}/rest/v1/rpc/${encodeURIComponent(functionName)}`, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${token}`,
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
