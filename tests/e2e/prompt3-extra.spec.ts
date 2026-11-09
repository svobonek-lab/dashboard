import { randomUUID } from 'node:crypto';
import { expect, test } from 'playwright/test';
import { accessToken, requiredValue, restGet, restPatch, signIn, stagingConfig } from './support';

test('owner lead detail, assignment and private attachment work on exact Preview', async ({ browser, page, request }) => {
  test.setTimeout(120_000);
  const { url, key } = stagingConfig();
  const companyId = requiredValue('STAGING_COMPANY_A_ID');
  const leadId = requiredValue('STAGING_LEAD_A_ID');
  const employeeId = requiredValue('STAGING_EMPLOYEE_A_ID');
  const token = await accessToken(browser, 'OWNER_A');
  const leadQuery = new URLSearchParams({ select: 'id,title,assigned_to', company_id: `eq.${companyId}`, id: `eq.${leadId}` }).toString();
  const before = await restGet(request, token, 'app_leads', leadQuery);
  expect(before).toHaveLength(1);
  const originalAssignee = before[0].assigned_to as string | null;
  const fileName = `prompt3-${randomUUID()}.pdf`;
  const fileQuery = new URLSearchParams({ select: 'id,storage_path,file_name', company_id: `eq.${companyId}`, lead_id: `eq.${leadId}`, file_name: `eq.${fileName}` }).toString();
  let cleanupError: Error | null = null;
  try {
    await signIn(page, 'OWNER_A');
    await page.goto('/leads');
    const leadCard = page.locator('[draggable="true"]').filter({ hasText: String(before[0].title) });
    await expect(leadCard).toHaveCount(1);
    await leadCard.getByRole('button', { name: 'Otevřít' }).click();
    await expect(page.getByRole('heading', { name: String(before[0].title) })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Zakázka a zákazník' })).toBeVisible();

    const documents = page.locator('section').filter({ has: page.getByRole('heading', { name: 'Poznámky a soubory' }) });
    await expect(documents.getByText('Nahrát soubor')).toBeVisible();
    await documents.locator('input[type="file"]').setInputFiles({
      name: fileName,
      mimeType: 'application/pdf',
      buffer: Buffer.from('%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF\n'),
    });
    await expect(documents.getByText(fileName)).toBeVisible();
    await expect.poll(async () => (await restGet(request, token, 'app_lead_files', fileQuery)).length).toBe(1);
    await documents.locator('article').filter({ hasText: fileName }).getByRole('button', { name: 'Smazat soubor' }).click();
    await expect.poll(async () => (await restGet(request, token, 'app_lead_files', fileQuery)).length).toBe(0);
    console.info('Prompt 3 lead detail and attachment upload/delete passed.');

    await page.getByLabel('Přiřazení').selectOption('');
    const assignmentResponse = page.waitForResponse((response) => response.url().includes('/rest/v1/app_leads') && response.request().method() === 'PATCH');
    await page.getByRole('button', { name: 'Uložit přiřazení' }).click();
    const assignment = await assignmentResponse;
    const assignmentBody = await assignment.json().catch(() => null) as { code?: unknown } | null;
    const assignmentCode = typeof assignmentBody?.code === 'string' && /^[A-Z0-9_.-]{1,64}$/i.test(assignmentBody.code) ? assignmentBody.code : 'unclassified';
    console.info(`Prompt 3 assignment PATCH HTTP ${assignment.status()} code=${assignmentCode}.`);
    await expect.poll(async () => (await restGet(request, token, 'app_leads', leadQuery))[0]?.assigned_to).toBeNull();
    await page.getByLabel('Přiřazení').selectOption(employeeId);
    await page.getByRole('button', { name: 'Uložit přiřazení' }).click();
    await expect.poll(async () => (await restGet(request, token, 'app_leads', leadQuery))[0]?.assigned_to).toBe(employeeId);
    console.info('Prompt 3 assignment change and restore passed.');
  } finally {
    const current = await restGet(request, token, 'app_leads', leadQuery);
    if (current[0]?.assigned_to !== originalAssignee) {
      const restore = await restPatch(request, token, 'app_leads', `id=eq.${leadId}&company_id=eq.${companyId}`, { assigned_to: originalAssignee });
      if (!restore.ok()) cleanupError = new Error(`Lead assignment restore failed: HTTP ${restore.status()}`);
    }
    const files = await restGet(request, token, 'app_lead_files', fileQuery);
    for (const file of files) {
      const path = String(file.storage_path);
      const metadataDelete = await request.delete(`${url}/rest/v1/app_lead_files?id=eq.${file.id}&company_id=eq.${companyId}`, {
        headers: { apikey: key, Authorization: `Bearer ${token}`, Prefer: 'return=representation' },
      });
      const objectDelete = await request.delete(`${url}/storage/v1/object/lead-files`, {
        headers: { apikey: key, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        data: { prefixes: [path] },
      });
      if (!metadataDelete.ok() || !objectDelete.ok()) cleanupError = new Error('Private attachment cleanup failed.');
    }
    if (cleanupError) throw cleanupError;
  }
});

test('CSV dry-run, commit retry and rollback are tenant scoped and idempotent', async ({ browser, request }) => {
  test.setTimeout(120_000);
  const { url, key, preview } = stagingConfig();
  const serviceKey = requiredValue('STAGING_SUPABASE_SERVICE_ROLE_KEY');
  const companyId = requiredValue('STAGING_COMPANY_A_ID');
  const token = await accessToken(browser, 'OWNER_A');
  const authProbe = await request.get(`${url}/auth/v1/user`, { headers: { apikey: key, Authorization: `Bearer ${token}` } });
  console.info(`Prompt 3 direct Supabase Auth user probe HTTP ${authProbe.status()}.`);
  expect(authProbe.status()).toBe(200);
  const marker = randomUUID();
  const title = `StavbaFlow Playwright Import ${marker}`;
  const email = `playwright-import-${marker}@stavbaflow.example.test`;
  const fileName = `stavbaflow-playwright-${marker}.csv`;
  const csv = `customer,title,email\nSynthetic Playwright Customer,${title},${email}\n`;
  const mapping = { customer: 'customerName', title: 'title', email: 'customerEmail' };
  const query = new URLSearchParams({ select: 'id,company_id,title,import_fingerprint', company_id: `eq.${companyId}`, title: `eq.${title}` }).toString();
  expect(await restGet(request, token, 'app_leads', query)).toHaveLength(0);
  let fingerprint = '';
  try {
    const dryRun = await request.post(`${preview}/api/import-leads`, { data: { mode: 'dry_run', companyId, fileName, csv, mapping } });
    expect(dryRun.status()).toBe(200);
    const previewBody = await dryRun.json();
    expect(previewBody.rows).toBe(1);
    fingerprint = String(previewBody.fingerprint);
    expect(fingerprint).toMatch(/^csv_[a-f0-9]{8}$/i);
    expect(await restGet(request, token, 'app_leads', query)).toHaveLength(0);

    const body = { mode: 'commit', companyId, fileName, csv, mapping, fingerprint };
    const headers = { Authorization: `Bearer ${token}` };
    const first = await request.post(`${preview}/api/import-leads`, { headers, data: body });
    expect(first.status(), 'Initial CSV commit failed.').toBe(200);
    const retry = await request.post(`${preview}/api/import-leads`, { headers, data: body });
    expect(retry.status(), 'Identical CSV retry failed.').toBe(200);
    const rows = await restGet(request, token, 'app_leads', query);
    expect(rows).toHaveLength(1);
    expect(rows[0].company_id).toBe(companyId);
    expect(rows[0].import_fingerprint).toBe(fingerprint);
    console.info('Prompt 3 CSV dry-run, commit and idempotent retry passed.');
  } finally {
    if (fingerprint && (await restGet(request, token, 'app_leads', query)).length > 0) {
      const rollback = await fetch(`${url}/rest/v1/rpc/app_rollback_import`, {
        method: 'POST',
        headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ p_company_id: companyId, p_fingerprint: fingerprint }),
      });
      expect(rollback.ok, `CSV rollback failed: HTTP ${rollback.status}`).toBe(true);
      const result = await rollback.json();
      expect(result.status).toBe('rolled_back');
      expect(await restGet(request, token, 'app_leads', query)).toHaveLength(0);
      console.info('Prompt 3 CSV rollback verified: zero synthetic rows remain.');
    }
  }
});

test('owner and employee of company B have active isolated workspaces', async ({ browser, request }) => {
  const { url, key, preview } = stagingConfig();
  const companyB = requiredValue('STAGING_COMPANY_B_ID');
  const employeeB = requiredValue('STAGING_EMPLOYEE_B_ID');
  const leadB = requiredValue('STAGING_LEAD_B_ID');
  for (const account of ['OWNER_B', 'EMPLOYEE_B'] as const) {
    const context = await browser.newContext({ baseURL: preview });
    try {
      const page = await context.newPage();
      await page.goto('/login');
      await page.getByPlaceholder('jmeno@firma.cz').fill(requiredValue(`STAGING_${account}_EMAIL`));
      await page.locator('input[type="password"]').fill(requiredValue(`STAGING_${account}_PASSWORD`));
      await page.getByRole('button', { name: 'Přihlásit se' }).click();
      await page.waitForURL((pageUrl) => !pageUrl.pathname.endsWith('/login'), { timeout: 20_000 });
      expect(new URL(page.url()).pathname).toMatch(account === 'EMPLOYEE_B' ? /^\/employee(?:\/|$)/ : /^\/dashboard(?:\/|$)/);
      const token = await page.evaluate(() => {
        for (let index = 0; index < localStorage.length; index += 1) {
          const storageKey = localStorage.key(index);
          if (!storageKey?.endsWith('-auth-token')) continue;
          const session = JSON.parse(localStorage.getItem(storageKey) || 'null') as { access_token?: string } | null;
          if (session?.access_token) return session.access_token;
        }
        return null;
      });
      expect(token).toBeTruthy();
      const response = await request.get(`${url}/rest/v1/app_leads?select=id,company_id,assigned_to&id=eq.${leadB}`, {
        headers: { apikey: key, Authorization: `Bearer ${token}` },
      });
      expect(response.status()).toBe(200);
      const rows = await response.json() as Array<{ id: string; company_id: string; assigned_to: string | null }>;
      expect(rows).toHaveLength(1);
      expect(rows[0].company_id).toBe(companyB);
      if (account === 'EMPLOYEE_B') expect(rows[0].assigned_to).toBe(employeeB);
      console.info(`Prompt 3 ${account} active login and own-company lead read passed.`);
    } finally {
      await context.close();
    }
  }
});
