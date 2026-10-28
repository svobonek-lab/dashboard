import { expect, test } from 'playwright/test';
import { accessToken, requiredValue, restDelete, restGet, restPatch, signIn, stagingConfig } from './support';

async function cleanupSyntheticImport(request: Parameters<typeof restGet>[0], ownerToken: string, companyId: string) {
  const query = new URLSearchParams({
    select: 'id,company_id,email,title,customer',
    company_id: `eq.${companyId}`,
    email: 'eq.playwright-import@stavbaflow.example.test',
    title: 'eq.StavbaFlow Playwright Import',
  }).toString();
  const rows = await restGet(request, ownerToken, 'app_leads', query);
  for (const row of rows) {
    expect(row.company_id).toBe(companyId);
    expect(row.email).toBe('playwright-import@stavbaflow.example.test');
    expect(row.title).toBe('StavbaFlow Playwright Import');
    expect(row.customer).toBe('Synthetic Playwright Customer');
    const deletion = await restDelete(
      request,
      ownerToken,
      'app_leads',
      `id=eq.${encodeURIComponent(String(row.id))}&company_id=eq.${encodeURIComponent(companyId)}`,
    );
    expect(deletion.ok(), `Failed to delete the exact synthetic CSV import row (HTTP ${deletion.status()}).`).toBe(true);
    const deletedRows = await deletion.json() as Array<Record<string, unknown>>;
    expect(deletedRows).toHaveLength(1);
    expect(deletedRows[0].id).toBe(row.id);
  }
  expect(await restGet(request, ownerToken, 'app_leads', query)).toHaveLength(0);
}

test('owner login, status change, CSV import/export and logout have no uncaught console errors', async ({ page, request }) => {
  stagingConfig();
  const companyId = requiredValue('STAGING_COMPANY_A_ID');
  const leadId = requiredValue('STAGING_LEAD_A_ID');
  const ownerToken = await accessToken(request, 'OWNER_A');
  const leadQuery = new URLSearchParams({ select: 'id,company_id,title,status', id: `eq.${leadId}`, company_id: `eq.${companyId}` });
  const startingRows = await restGet(request, ownerToken, 'app_leads', leadQuery.toString());
  expect(startingRows).toHaveLength(1);
  const lead = startingRows[0];
  const originalStatus = String(lead.status);
  const importQuery = new URLSearchParams({
    select: 'id,company_id,email,title,customer',
    company_id: `eq.${companyId}`,
    email: 'eq.playwright-import@stavbaflow.example.test',
    title: 'eq.StavbaFlow Playwright Import',
  }).toString();
  expect(await restGet(request, ownerToken, 'app_leads', importQuery), 'A previous run left the reserved CSV fixture behind.').toHaveLength(0);
  const uncaughtErrors: string[] = [];
  let signedIn = false;
  let importStarted = false;

  page.on('pageerror', () => uncaughtErrors.push('pageerror'));
  page.on('console', (message) => {
    if (message.type() === 'error') uncaughtErrors.push('console.error');
  });

  try {
    await signIn(page, 'OWNER_A');
    signedIn = true;
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);

    await page.goto('/leads');
    const leadCard = page.locator('[draggable="true"]').filter({ hasText: String(lead.title) });
    await expect(leadCard).toHaveCount(1);
    await leadCard.dragTo(page.locator('#kanban-col-Contacted'));
    await expect.poll(async () => {
      const rows = await restGet(request, ownerToken, 'app_leads', leadQuery.toString());
      return rows[0]?.status;
    }, { message: 'Staging did not persist the synthetic lead status change.' }).toBe('contacted');

    await page.goto('/integrations');
    await page.getByRole('button', { name: /Nahrát CSV/ }).click();
    const csv = 'customer,title,value,phone,email\nSynthetic Playwright Customer,StavbaFlow Playwright Import,0,+420700000000,playwright-import@stavbaflow.example.test\n';
    await page.locator('input[type="file"]').setInputFiles({
      name: 'stavbaflow-playwright-synthetic.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
    await page.getByRole('button', { name: /Potvrdit mapování/ }).click();
    importStarted = true;
    await page.getByRole('button', { name: /Importovat 1 zakázek/ }).click();
    await expect(page.getByText(/Import byl uložen/)).toBeVisible();

    await page.goto('/settings');
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Stáhnout CSV' }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^stavbaflow-export-\d{4}-\d{2}-\d{2}\.csv$/);
    const exportStream = await download.createReadStream();
    expect(exportStream, 'The synthetic owner export should be readable for a tenant-leak assertion.').not.toBeNull();
    const exportChunks: Buffer[] = [];
    for await (const chunk of exportStream!) exportChunks.push(Buffer.from(chunk));
    const exportedCsv = Buffer.concat(exportChunks).toString('utf8');
    expect(exportedCsv).not.toContain('StavbaFlow E2E Isolation Lead B');
    expect(exportedCsv).not.toContain('e2e-lead-b@stavbaflow.example.test');
    const exportMatrix = [
      { resource: 'owner CSV export', operation: 'read as owner A', result: 'company A export downloaded' },
      { resource: 'owner CSV export', operation: 'cross-company B marker check', result: 'no company B marker visible' },
    ];
    test.info().annotations.push({ type: 'tenant-isolation-matrix', description: JSON.stringify(exportMatrix) });
    console.info('Tenant isolation matrix\n' + exportMatrix.map(row => `${row.resource} | ${row.operation} | ${row.result}`).join('\n'));
  } finally {
    try {
      if (importStarted) await cleanupSyntheticImport(request, ownerToken, companyId);
    } finally {
      const currentRows = await restGet(request, ownerToken, 'app_leads', leadQuery.toString()).catch(() => []);
      if (currentRows[0]?.status !== originalStatus) {
        const restore = await restPatch(request, ownerToken, 'app_leads', `id=eq.${leadId}&company_id=eq.${companyId}`, { status: originalStatus });
        expect(restore.ok(), 'Failed to restore the synthetic status fixture after the browser flow.').toBe(true);
      }
      if (signedIn && await page.getByRole('button', { name: 'Odhlásit' }).count()) {
        await page.getByRole('button', { name: 'Odhlásit' }).click();
        await expect(page).toHaveURL(/\/login(?:\?|$)/);
      }
    }
  }

  expect(uncaughtErrors).toEqual([]);
});
