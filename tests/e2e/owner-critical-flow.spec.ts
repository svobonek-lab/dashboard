import { randomUUID } from 'node:crypto';
import { expect, test } from 'playwright/test';
import { accessToken, requiredValue, restDelete, restGet, restRpc, signIn, stagingConfig } from './support';

function safeBrowserDiagnostic(value: string): string {
  return value
    .replace(/Bearer\s+\S+/gi, 'Bearer [redacted]')
    .replace(/\beyJ[a-zA-Z0-9_-]{10,}\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\b/g, '[jwt]')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email]')
    .replace(/https?:\/\/[^\s"']+/gi, (value) => {
      try {
        const url = new URL(value);
        return `${url.origin}${url.pathname}`;
      } catch {
        return '[url]';
      }
    })
    .replace(/\b[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}\b/gi, '[id]')
    .slice(0, 300);
}

async function cleanupSyntheticImport(
  request: Parameters<typeof restGet>[0],
  ownerToken: string,
  companyId: string,
  fixture: { email: string; title: string },
) {
  const query = new URLSearchParams({
    select: 'id,company_id,email,title,customer',
    company_id: `eq.${companyId}`,
    email: `eq.${fixture.email}`,
    title: `eq.${fixture.title}`,
  }).toString();
  const rows = await restGet(request, ownerToken, 'app_leads', query);
  for (const row of rows) {
    expect(row.company_id).toBe(companyId);
    expect(row.email).toBe(fixture.email);
    expect(row.title).toBe(fixture.title);
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

test('owner login, status change, CSV import/export and logout have no uncaught console errors', async ({ browser, page, request }) => {
  stagingConfig();
  const companyId = requiredValue('STAGING_COMPANY_A_ID');
  const leadId = requiredValue('STAGING_LEAD_A_ID');
  const ownerToken = await accessToken(browser, 'OWNER_A');
  const importId = randomUUID();
  const importTitle = `StavbaFlow Playwright Import ${importId}`;
  const importEmail = `playwright-import-${importId}@stavbaflow.example.test`;
  const importFileName = `stavbaflow-playwright-${importId}.csv`;
  const importFixture = { email: importEmail, title: importTitle };
  const leadQuery = new URLSearchParams({ select: 'id,company_id,title,status', id: `eq.${leadId}`, company_id: `eq.${companyId}` });
  const startingRows = await restGet(request, ownerToken, 'app_leads', leadQuery.toString());
  expect(startingRows).toHaveLength(1);
  const lead = startingRows[0];
  const originalStatus = String(lead.status);
  const importQuery = new URLSearchParams({
    select: 'id,company_id,email,title,customer',
    company_id: `eq.${companyId}`,
    email: `eq.${importEmail}`,
    title: `eq.${importTitle}`,
  }).toString();
  expect(await restGet(request, ownerToken, 'app_leads', importQuery), 'A previous run left the reserved CSV fixture behind.').toHaveLength(0);
  const uncaughtErrors: string[] = [];
  const failedHttpResponses = new Set<string>();
  let signedIn = false;
  let importStarted = false;
  let flowError: unknown;
  let importFailure: string | null = null;
  const cleanupErrors: unknown[] = [];

  page.on('pageerror', (error) => uncaughtErrors.push(`pageerror: ${safeBrowserDiagnostic(error.message)}`));
  page.on('console', (message) => {
    if (message.type() === 'error') uncaughtErrors.push(`console.error: ${safeBrowserDiagnostic(message.text())}`);
  });
  page.on('response', (response) => {
    if (response.status() < 400) return;
    try {
      const url = new URL(response.url());
      failedHttpResponses.add(`${response.status()} ${url.origin}${url.pathname}`);
    } catch {
      failedHttpResponses.add(`${response.status()} [invalid URL]`);
    }
  });

  try {
    await signIn(page, 'OWNER_A');
    signedIn = true;
    await expect(page).toHaveURL(/\/dashboard(?:\?|$)/);
    console.info('Owner E2E checkpoint: signed in');

    await page.goto('/leads');
    const leadCard = page.locator('[draggable="true"]').filter({ hasText: String(lead.title) });
    await expect(leadCard).toHaveCount(1);
    const source = await leadCard.boundingBox();
    const target = await page.locator('#kanban-col-Contacted').boundingBox();
    expect(source).not.toBeNull();
    expect(target).not.toBeNull();
    await page.mouse.move(source!.x + source!.width / 2, source!.y + source!.height / 2);
    await page.mouse.down();
    await page.mouse.move(source!.x + source!.width / 2 + 25, source!.y + source!.height / 2 + 25, { steps: 5 });
    await page.mouse.move(target!.x + target!.width / 2, target!.y + 120, { steps: 12 });
    await page.mouse.up();
    await expect.poll(async () => {
      const rows = await restGet(request, ownerToken, 'app_leads', leadQuery.toString());
      return rows[0]?.status;
    }, { message: 'Staging did not persist the synthetic lead status change.' }).toBe('contacted');
    console.info('Owner E2E checkpoint: status persisted');

    await page.goto('/integrations');
    await page.getByRole('button', { name: /Nahrát CSV/ }).click();
    console.info('Owner E2E checkpoint: CSV dialog opened');
    const csv = `customer,title,value,phone,email\nSynthetic Playwright Customer,${importTitle},0,+420700000000,${importEmail}\n`;
    await page.locator('input[type="file"]').setInputFiles({
      name: importFileName,
      mimeType: 'text/csv',
      buffer: Buffer.from(csv),
    });
    await page.getByRole('button', { name: /Potvrdit mapování/ }).click();
    console.info('Owner E2E checkpoint: CSV mapping confirmed');
    importStarted = true;
    const commitResponsePromise = page.waitForResponse((response) => {
      if (!response.url().includes('/api/import-leads') || response.request().method() !== 'POST') return false;
      try {
        return response.request().postDataJSON()?.mode === 'commit';
      } catch {
        return false;
      }
    });
    await page.getByRole('button', { name: /Importovat 1 zakázek/ }).click();
    const commitResponse = await commitResponsePromise;
    const commitBody = await commitResponse.json().catch(() => null) as { code?: unknown } | null;
    const commitCode = typeof commitBody?.code === 'string' && /^[A-Z0-9_]{1,80}$/.test(commitBody.code)
      ? commitBody.code
      : 'unclassified';
    console.info(`Owner E2E checkpoint: CSV commit HTTP ${commitResponse.status()} code=${commitCode}`);
    await expect(page.getByRole('button', { name: /Importuji data do CRM/ })).toBeHidden({ timeout: 10000 });
    if (commitResponse.ok()) {
      await expect(page.getByText(/Import byl uložen/)).toBeVisible();
      console.info('Owner E2E checkpoint: CSV import persisted');
    } else {
      importFailure = `Staging CSV commit rejected: HTTP ${commitResponse.status()} code=${commitCode}`;
      await expect(page.getByText(/^Chyba:/)).toBeVisible();
      console.info(`Owner E2E checkpoint: CSV error shown to user (${commitCode})`);
    }
    const importDialogHeading = page.getByRole('heading', { name: 'Kontrolovaný CSV import' });
    const importDialog = page.locator('div.fixed.inset-0.z-50').filter({ has: importDialogHeading });
    await importDialog.getByRole('button', { name: 'Zavřít', exact: true }).click();
    await expect(importDialog).toHaveCount(0, { timeout: 5000 });
    console.info('Owner E2E checkpoint: CSV dialog closed');

    await page.goto('/settings');
    console.info(`Owner E2E checkpoint: settings route ${new URL(page.url()).pathname}`);
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Stáhnout CSV' }).click();
    const download = await downloadPromise;
    console.info('Owner E2E checkpoint: CSV export downloaded');
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
  } catch (error) {
    flowError = error;
  } finally {
    if (importStarted) {
      try {
        await cleanupSyntheticImport(request, ownerToken, companyId, importFixture);
      } catch (error) {
        cleanupErrors.push(error);
      }
    }

    try {
      const currentRows = await restGet(request, ownerToken, 'app_leads', leadQuery.toString());
      if (currentRows[0]?.status !== originalStatus) {
        const restore = await restRpc(request, ownerToken, 'app_change_lead_status', { p_lead_id: leadId, p_status: originalStatus });
        expect(restore.ok(), 'Failed to restore the synthetic status fixture through the approved status RPC.').toBe(true);
      }
    } catch (error) {
      cleanupErrors.push(error);
    }

    if (signedIn) {
      try {
        const mappingHeading = page.getByRole('heading', { name: 'Mapování sloupců importovaného souboru' });
        if (await mappingHeading.isVisible().catch(() => false)) {
          const mappingDialog = page.locator('div.fixed.inset-0.z-50').filter({ has: mappingHeading });
          await mappingDialog.getByRole('button', { name: '✕' }).click({ timeout: 5000 });
          await expect(mappingHeading).toBeHidden({ timeout: 5000 });
        }

        const importHeading = page.getByRole('heading', { name: 'Kontrolovaný CSV import' });
        const importDialog = page.locator('div.fixed.inset-0.z-50').filter({ has: importHeading });
        if (await importDialog.count()) {
          await importDialog.getByRole('button', { name: 'Zavřít', exact: true }).click({ timeout: 5000 });
          await expect(importDialog).toHaveCount(0, { timeout: 5000 });
        }

        const visibleOverlays = await page.locator('div.fixed.inset-0.z-50').evaluateAll((overlays) => overlays
          .filter((overlay) => {
            const rect = overlay.getBoundingClientRect();
            const style = window.getComputedStyle(overlay);
            return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
          })
          .map((overlay) => {
            const headings = Array.from(overlay.querySelectorAll('h1,h2,h3')).map((heading) => heading.textContent?.trim() ?? '');
            return headings.find((heading) => [
              'Kontrolovaný CSV import', 'Mapování sloupců importovaného souboru',
              'Vytvořit novou zakázku / poptávku', 'Pozvat zaměstnance',
            ].includes(heading)) ?? 'other-dialog';
          }));
        console.info(`Owner E2E teardown overlays: ${visibleOverlays.join(',') || 'none'}`);
        if (await page.getByRole('button', { name: 'Odhlásit' }).count()) {
          await page.getByRole('button', { name: 'Odhlásit' }).click({ timeout: 10000 });
          await expect(page).toHaveURL(/\/login(?:\?|$)/);
        }
      } catch (error) {
        cleanupErrors.push(error);
      }
    }
  }

  const failures = [flowError, ...cleanupErrors].filter((error): error is Error => error instanceof Error);
  if (failures.length === 1) throw failures[0];
  if (failures.length > 1) throw new AggregateError(failures, 'Owner browser flow or its cleanup failed.');

  if (uncaughtErrors.length) console.info(`Browser errors (sanitized):\n${uncaughtErrors.join('\n')}`);
  if (failedHttpResponses.size) console.info(`HTTP error responses (path only):\n${[...failedHttpResponses].sort().join('\n')}`);
  expect(uncaughtErrors).toEqual([]);
  if (importFailure) throw new Error(importFailure);
});
