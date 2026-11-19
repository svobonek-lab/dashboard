import { randomUUID } from 'node:crypto';
import { expect, test, type Page } from 'playwright/test';
import { accessToken, requiredValue, restDelete, restGet, restInsert, signIn, stagingConfig } from './support';
import { buildTenantLeadFixture } from '../../scripts/seed-two-tenants';

const jpeg = Buffer.from('/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgMCAgMDAwMEAwMEBQgFBQQEBQoHBwYIDAoMDAsKCwsNDhIQDQ4RDgsLEBYQERMUFRUVDA8XGBYUGBIUFRT/2wBDAQMEBAUEBQkFBQkUDQsNFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBQUFBT/wAARCAACAAIDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD8rZ55LmaSaaRpZZGLvI7EszE5JJPUmiiis6fwL0OvF/7xU/xP8z//2Q==', 'base64');
const pdf = Buffer.from('%PDF-1.4\n1 0 obj<< /Type /Catalog >>endobj\ntrailer<< /Root 1 0 R >>\n%%EOF\n');

async function openLead(page: Page, role: 'owner' | 'employee', title: string) {
  if (role === 'owner') {
    await page.goto('/leads');
    await page.getByText(title, { exact: true }).first().click();
  } else {
    await page.goto('/employee/dashboard');
    await page.getByRole('article').filter({ has: page.getByRole('heading', { name: title }) }).getByRole('button', { name: /Otevřít detail/ }).click();
  }
  await expect(page.getByRole('heading', { name: 'Poznámky a soubory' })).toBeVisible();
  await expect(page.getByText('Poznámky a soubory nejsou v tomto prostředí zapnuté.')).toHaveCount(0);
}

test('owner and assigned employee persist notes, PDF and JPEG; company B is isolated', async ({ browser, request }) => {
  test.setTimeout(120_000);
  const { preview, url, key } = stagingConfig();
  const companyA = requiredValue('STAGING_COMPANY_A_ID');
  const leadA = requiredValue('STAGING_LEAD_A_ID');
  const ownerAId = requiredValue('STAGING_OWNER_A_ID');
  const ownerBId = requiredValue('STAGING_OWNER_B_ID');
  const employeeAId = requiredValue('STAGING_EMPLOYEE_A_ID');
  const run = randomUUID().slice(0, 8);
  const noteOwner = `Synthetic attachment owner ${run}`;
  const noteEmployee = `Synthetic attachment employee ${run}`;
  const names = [`owner-${run}.pdf`, `owner-${run}.jpg`, `employee-${run}.pdf`, `employee-${run}.jpg`];
  const title = 'StavbaFlow E2E Isolation Lead A';
  const ownerContext = await browser.newContext({ baseURL: preview });
  const employeeContext = await browser.newContext({ baseURL: preview });
  let ownerToken: string | null = null;
  let orphanPath: string | null = null;
  try {
    const owner = await ownerContext.newPage();
    const employee = await employeeContext.newPage();
    await signIn(owner, 'OWNER_A');
    await signIn(employee, 'EMPLOYEE_A');
    ownerToken = await accessToken(browser, 'OWNER_A');
    const ownerBToken = await accessToken(browser, 'OWNER_B');

    for (const [page, role, body, prefix] of [
      [owner, 'owner', noteOwner, 'owner'],
      [employee, 'employee', noteEmployee, 'employee'],
    ] as const) {
      await openLead(page, role, title);
      await page.getByLabel('Nová poznámka').fill(body);
      await page.getByRole('button', { name: 'Uložit poznámku' }).click();
      await expect(page.getByText(body, { exact: true })).toBeVisible();
      for (const [extension, mimeType, buffer] of [
        ['pdf', 'application/pdf', pdf], ['jpg', 'image/jpeg', jpeg],
      ] as const) {
        await page.locator('input[type="file"][accept*="application/pdf"]').setInputFiles({
          name: `${prefix}-${run}.${extension}`, mimeType, buffer,
        });
        await expect(page.getByText(`${prefix}-${run}.${extension}`, { exact: true })).toBeVisible();
      }
      await page.reload();
      await openLead(page, role, title);
      await expect(page.getByText(body, { exact: true })).toBeVisible();
      for (const extension of ['pdf', 'jpg']) {
        const card = page.locator('article').filter({ hasText: `${prefix}-${run}.${extension}` });
        await expect(card).toBeVisible();
        const signedUrl = await card.locator('a').first().getAttribute('href');
        expect(signedUrl).toBeTruthy();
        const opened = await request.get(signedUrl!);
        expect(opened.status()).toBe(200);
      }
    }

    const noteRows = (await Promise.all([noteOwner, noteEmployee].map(body =>
      restGet(request, ownerToken!, 'app_lead_notes', `select=id,body,author_id&company_id=eq.${companyA}&lead_id=eq.${leadA}&body=eq.${encodeURIComponent(body)}`),
    ))).flat();
    expect(noteRows).toHaveLength(2);
    expect(new Set(noteRows.map(row => row.author_id))).toEqual(new Set([ownerAId, employeeAId]));
    const fileRows = await restGet(request, ownerToken, 'app_lead_files', `select=id,file_name,storage_path&company_id=eq.${companyA}&lead_id=eq.${leadA}`);
    const created = fileRows.filter(row => names.includes(String(row.file_name)));
    expect(created).toHaveLength(4);

    for (const table of ['app_lead_notes', 'app_lead_files']) {
      const rows = await restGet(request, ownerBToken, table, `select=id&company_id=eq.${companyA}&lead_id=eq.${leadA}`);
      expect(rows).toHaveLength(0);
    }
    const foreignInsert = await restInsert(request, ownerBToken, 'app_lead_notes', {
      company_id: companyA, lead_id: leadA, author_id: ownerBId, body: `forbidden-${run}`,
    });
    expect(foreignInsert.ok()).toBe(false);
    const foreignDelete = await restDelete(request, ownerBToken, 'app_lead_notes', `id=eq.${noteRows[0].id}&company_id=eq.${companyA}`);
    expect(await foreignDelete.json()).toEqual([]);
    const firstPath = String(created[0].storage_path).split('/').map(encodeURIComponent).join('/');
    const foreignStorage = await request.get(`${url}/storage/v1/object/authenticated/lead-files/${firstPath}`, {
      headers: { apikey: key, Authorization: `Bearer ${ownerBToken}` },
    });
    expect(foreignStorage.status()).not.toBe(200);
    const foreignFileId = randomUUID();
    const foreignPath = `${companyA}/${leadA}/${foreignFileId}-foreign.pdf`;
    const foreignFileInsert = await restInsert(request, ownerBToken, 'app_lead_files', {
      id: foreignFileId, company_id: companyA, lead_id: leadA, author_id: ownerBId,
      storage_path: foreignPath, file_name: 'foreign.pdf', mime_type: 'application/pdf', size_bytes: pdf.byteLength,
    });
    expect(foreignFileInsert.ok()).toBe(false);
    const foreignFileDelete = await restDelete(request, ownerBToken, 'app_lead_files', `id=eq.${created[0].id}&company_id=eq.${companyA}`);
    expect(await foreignFileDelete.json()).toEqual([]);
    const foreignUpload = await request.post(`${url}/storage/v1/object/lead-files/${foreignPath.split('/').map(encodeURIComponent).join('/')}`, {
      headers: { apikey: key, Authorization: `Bearer ${ownerBToken}`, 'Content-Type': 'application/pdf', 'x-upsert': 'false' },
      data: pdf,
    });
    expect(foreignUpload.ok()).toBe(false);
    const foreignStorageDelete = await request.delete(`${url}/storage/v1/object/lead-files`, {
      headers: { apikey: key, Authorization: `Bearer ${ownerBToken}`, 'Content-Type': 'application/json' },
      data: { prefixes: [String(created[0].storage_path)] },
    });
    expect(foreignStorageDelete.status()).toBeLessThan(500);
    const ownerStorageControl = await request.get(`${url}/storage/v1/object/authenticated/lead-files/${firstPath}`, {
      headers: { apikey: key, Authorization: `Bearer ${ownerToken}` },
    });
    expect(ownerStorageControl.status()).toBe(200);

    const deniedOwnerNote = await restDelete(request, await accessToken(browser, 'EMPLOYEE_A'), 'app_lead_notes', `id=eq.${noteRows.find(row => row.body === noteOwner)?.id}&company_id=eq.${companyA}`);
    expect(await deniedOwnerNote.json()).toEqual([]);
    expect(await restGet(request, ownerToken, 'app_lead_notes', `select=id&body=eq.${encodeURIComponent(noteOwner)}&company_id=eq.${companyA}`)).toHaveLength(1);

    await owner.locator('input[type="file"][accept*="application/pdf"]').setInputFiles({
      name: `oversize-${run}.pdf`, mimeType: 'application/pdf', buffer: Buffer.alloc(15 * 1024 * 1024 + 1),
    });
    await expect(owner.getByRole('alert')).toContainText('15 MB');
    await owner.locator('input[type="file"][accept*="application/pdf"]').setInputFiles({
      name: `unsupported-${run}.html`, mimeType: 'text/html', buffer: Buffer.from('x'),
    });
    await expect(owner.getByRole('alert')).toContainText('Povolené jsou');
    expect(await restGet(request, ownerToken, 'app_lead_files', `select=id&company_id=eq.${companyA}&lead_id=eq.${leadA}&file_name=eq.${encodeURIComponent(`oversize-${run}.pdf`)}`)).toHaveLength(0);

    let previewFailed = false;
    await owner.route('**/storage/v1/object/sign/lead-files/**', route => {
      if (!previewFailed && route.request().method() === 'POST') {
        previewFailed = true;
        return route.abort();
      }
      return route.continue();
    });
    await owner.reload();
    await openLead(owner, 'owner', title);
    expect(previewFailed).toBe(true);
    await expect(owner.getByText(noteOwner, { exact: true })).toBeVisible();
    await expect(owner.getByText('Náhled není dostupný. Zkuste stránku obnovit.').first()).toBeVisible();
    await owner.unroute('**/storage/v1/object/sign/lead-files/**');

    let uploadAborted = false;
    await owner.route('**/storage/v1/object/upload/sign/lead-files/**', route => {
      if (route.request().method() === 'PUT') {
        uploadAborted = true;
        return route.abort();
      }
      return route.continue();
    });
    await owner.locator('input[type="file"][accept*="application/pdf"]').setInputFiles({
      name: `interrupted-${run}.pdf`, mimeType: 'application/pdf', buffer: pdf,
    });
    await expect(owner.getByRole('alert')).toContainText('nahrát');
    expect(uploadAborted).toBe(true);
    await owner.unroute('**/storage/v1/object/upload/sign/lead-files/**');
    expect(await restGet(request, ownerToken, 'app_lead_files', `select=id&company_id=eq.${companyA}&lead_id=eq.${leadA}&file_name=eq.${encodeURIComponent(`interrupted-${run}.pdf`)}`)).toHaveLength(0);

    const orphanRow = created.find(row => row.file_name === `owner-${run}.pdf`);
    expect(orphanRow).toBeTruthy();
    orphanPath = String(orphanRow!.storage_path);
    await owner.route('**/storage/v1/object/lead-files', route => route.request().method() === 'DELETE' ? route.abort() : route.continue());
    await owner.locator('article').filter({ hasText: `owner-${run}.pdf` }).getByRole('button', { name: 'Smazat soubor' }).click();
    await expect(owner.getByRole('alert')).toContainText('úklid souboru selhal');
    await owner.unroute('**/storage/v1/object/lead-files');
    expect(await restGet(request, ownerToken, 'app_lead_files', `select=id&company_id=eq.${companyA}&id=eq.${orphanRow!.id}`)).toHaveLength(0);
    const orphanControl = await request.get(`${url}/storage/v1/object/authenticated/lead-files/${orphanPath.split('/').map(encodeURIComponent).join('/')}`, {
      headers: { apikey: key, Authorization: `Bearer ${ownerToken}` },
    });
    expect(orphanControl.status()).toBe(200);

    const employeeOwnerNote = employee.locator('article').filter({ hasText: noteOwner });
    await expect(employeeOwnerNote.getByRole('button', { name: 'Smazat poznámku' })).toHaveCount(0);
    const ownerEmployeeNote = owner.locator('article').filter({ hasText: noteEmployee });
    await expect(ownerEmployeeNote.getByRole('button', { name: 'Smazat poznámku' })).toBeVisible();
    await employee.locator('article').filter({ hasText: noteEmployee }).getByRole('button', { name: 'Smazat poznámku' }).click();
    await expect(employee.getByText(noteEmployee, { exact: true })).toHaveCount(0);
    await owner.locator('article').filter({ hasText: noteOwner }).getByRole('button', { name: 'Smazat poznámku' }).click();
    await expect(owner.getByText(noteOwner, { exact: true })).toHaveCount(0);
  } finally {
    if (ownerToken) {
      for (const body of [noteOwner, noteEmployee]) {
        const rows = await restGet(request, ownerToken, 'app_lead_notes', `select=id&company_id=eq.${companyA}&lead_id=eq.${leadA}&body=eq.${encodeURIComponent(body)}`);
        for (const row of rows) await restDelete(request, ownerToken, 'app_lead_notes', `id=eq.${row.id}&company_id=eq.${companyA}`);
      }
      const rows = await restGet(request, ownerToken, 'app_lead_files', `select=id,file_name,storage_path&company_id=eq.${companyA}&lead_id=eq.${leadA}`);
      for (const row of rows.filter(item => names.includes(String(item.file_name)))) {
        await restDelete(request, ownerToken, 'app_lead_files', `id=eq.${row.id}&company_id=eq.${companyA}`);
        const removed = await request.delete(`${url}/storage/v1/object/lead-files`, {
          headers: { apikey: key, Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
          data: { prefixes: [row.storage_path] },
        });
        expect(removed.ok()).toBe(true);
        const check = await request.get(`${url}/storage/v1/object/authenticated/lead-files/${String(row.storage_path).split('/').map(encodeURIComponent).join('/')}`, {
          headers: { apikey: key, Authorization: `Bearer ${ownerToken}` },
        });
        expect(check.status()).not.toBe(200);
      }
      if (orphanPath) {
        const removed = await request.delete(`${url}/storage/v1/object/lead-files`, {
          headers: { apikey: key, Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
          data: { prefixes: [orphanPath] },
        });
        expect(removed.ok()).toBe(true);
        const check = await request.get(`${url}/storage/v1/object/authenticated/lead-files/${orphanPath.split('/').map(encodeURIComponent).join('/')}`, {
          headers: { apikey: key, Authorization: `Bearer ${ownerToken}` },
        });
        expect(check.status()).not.toBe(200);
      }
    }
    await ownerContext.close();
    await employeeContext.close();
  }
});

test('same-company employee cannot read or change another synthetic lead and its private file', async ({ browser, request }) => {
  test.setTimeout(90_000);
  const { url, key } = stagingConfig();
  const companyA = requiredValue('STAGING_COMPANY_A_ID');
  const ownerAId = requiredValue('STAGING_OWNER_A_ID');
  const employeeAId = requiredValue('STAGING_EMPLOYEE_A_ID');
  const [ownerToken, employeeToken] = await Promise.all([
    accessToken(browser, 'OWNER_A'), accessToken(browser, 'EMPLOYEE_A'),
  ]);
  const leadId = randomUUID();
  const fileId = randomUUID();
  const fileName = `unassigned-${fileId}.pdf`;
  const path = `${companyA}/${leadId}/${fileId}-${fileName}`;
  const encodedPath = path.split('/').map(encodeURIComponent).join('/');
  let leadCreated = false;
  let noteId: string | null = null;
  let fileCreated = false;
  let objectCreated = false;
  try {
    const lead = await restInsert(request, ownerToken, 'app_leads', {
      ...buildTenantLeadFixture('A', companyA, employeeAId),
      id: leadId, title: `Synthetic unassigned attachment ${fileId}`,
      assigned_to: null,
    });
    expect(lead.status()).toBe(201);
    leadCreated = true;
    const note = await restInsert(request, ownerToken, 'app_lead_notes', {
      company_id: companyA, lead_id: leadId, author_id: ownerAId, body: `Synthetic unassigned note ${fileId}`,
    });
    expect(note.status()).toBe(201);
    noteId = String((await note.json())[0].id);
    const upload = await request.post(`${url}/storage/v1/object/lead-files/${encodedPath}`, {
      headers: { apikey: key, Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/pdf', 'x-upsert': 'false' },
      data: pdf,
    });
    expect(upload.status()).toBe(200);
    objectCreated = true;
    const metadata = await restInsert(request, ownerToken, 'app_lead_files', {
      id: fileId, company_id: companyA, lead_id: leadId, author_id: ownerAId,
      storage_path: path, file_name: fileName, mime_type: 'application/pdf', size_bytes: pdf.byteLength,
    });
    expect(metadata.status()).toBe(201);
    fileCreated = true;

    for (const table of ['app_lead_notes', 'app_lead_files']) {
      const invisible = await restGet(request, employeeToken, table, `select=id&company_id=eq.${companyA}&lead_id=eq.${leadId}`);
      expect(invisible).toHaveLength(0);
      const deleted = await restDelete(request, employeeToken, table, `company_id=eq.${companyA}&lead_id=eq.${leadId}`);
      expect(await deleted.json()).toEqual([]);
    }
    const forbiddenNote = await restInsert(request, employeeToken, 'app_lead_notes', {
      company_id: companyA, lead_id: leadId, author_id: employeeAId, body: `forbidden-${fileId}`,
    });
    expect(forbiddenNote.ok()).toBe(false);
    const forbiddenFile = await restInsert(request, employeeToken, 'app_lead_files', {
      id: randomUUID(), company_id: companyA, lead_id: leadId, author_id: employeeAId,
      storage_path: `${companyA}/${leadId}/${randomUUID()}-forbidden.pdf`,
      file_name: 'forbidden.pdf', mime_type: 'application/pdf', size_bytes: pdf.byteLength,
    });
    expect(forbiddenFile.ok()).toBe(false);
    const privateRead = await request.get(`${url}/storage/v1/object/authenticated/lead-files/${encodedPath}`, {
      headers: { apikey: key, Authorization: `Bearer ${employeeToken}` },
    });
    expect(privateRead.status()).not.toBe(200);
    const privateWrite = await request.post(`${url}/storage/v1/object/lead-files/${companyA}/${leadId}/${randomUUID()}-forbidden.pdf`, {
      headers: { apikey: key, Authorization: `Bearer ${employeeToken}`, 'Content-Type': 'application/pdf', 'x-upsert': 'false' },
      data: pdf,
    });
    expect(privateWrite.ok()).toBe(false);
    const privateDelete = await request.delete(`${url}/storage/v1/object/lead-files`, {
      headers: { apikey: key, Authorization: `Bearer ${employeeToken}`, 'Content-Type': 'application/json' },
      data: { prefixes: [path] },
    });
    expect(privateDelete.status()).toBeLessThan(500);
    const ownerControl = await request.get(`${url}/storage/v1/object/authenticated/lead-files/${encodedPath}`, {
      headers: { apikey: key, Authorization: `Bearer ${ownerToken}` },
    });
    expect(ownerControl.status()).toBe(200);
  } finally {
    if (fileCreated) await restDelete(request, ownerToken, 'app_lead_files', `id=eq.${fileId}&company_id=eq.${companyA}`);
    if (objectCreated) {
      const removed = await request.delete(`${url}/storage/v1/object/lead-files`, {
        headers: { apikey: key, Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
        data: { prefixes: [path] },
      });
      expect(removed.ok()).toBe(true);
    }
    if (noteId) await restDelete(request, ownerToken, 'app_lead_notes', `id=eq.${noteId}&company_id=eq.${companyA}`);
    if (leadCreated) await restDelete(request, ownerToken, 'app_leads', `id=eq.${leadId}&company_id=eq.${companyA}`);
  }
});

test('private Storage enforces the exact 15 MiB and MIME boundaries', async ({ browser, request }) => {
  test.setTimeout(90_000);
  const { url, key } = stagingConfig();
  const companyA = requiredValue('STAGING_COMPANY_A_ID');
  const leadA = requiredValue('STAGING_LEAD_A_ID');
  const ownerAId = requiredValue('STAGING_OWNER_A_ID');
  const ownerToken = await accessToken(browser, 'OWNER_A');
  const fileId = randomUUID();
  const path = `${companyA}/${leadA}/${fileId}-exact-limit.pdf`;
  const largePdf = Buffer.alloc(15 * 1024 * 1024, 0x20);
  pdf.copy(largePdf);
  let objectCreated = false;
  let metadataCreated = false;
  const upload = (name: string, mimeType: string, buffer: Buffer) =>
    request.post(`${url}/storage/v1/object/lead-files/${name.split('/').map(encodeURIComponent).join('/')}`, {
      headers: { apikey: key, Authorization: `Bearer ${ownerToken}`, 'Content-Type': mimeType, 'x-upsert': 'false' },
      data: buffer,
    });
  try {
    const exact = await upload(path, 'application/pdf', largePdf);
    expect(exact.status()).toBe(200);
    objectCreated = true;
    const metadata = await restInsert(request, ownerToken, 'app_lead_files', {
      id: fileId, company_id: companyA, lead_id: leadA, author_id: ownerAId,
      storage_path: path, file_name: 'exact-limit.pdf', mime_type: 'application/pdf', size_bytes: largePdf.byteLength,
    });
    expect(metadata.status()).toBe(201);
    metadataCreated = true;
    const oversized = await upload(`${companyA}/${leadA}/${randomUUID()}-oversized.pdf`, 'application/pdf', Buffer.alloc(15 * 1024 * 1024 + 1));
    expect(oversized.ok()).toBe(false);
    const badMime = await upload(`${companyA}/${leadA}/${randomUUID()}-unsupported.html`, 'text/html', Buffer.from('synthetic'));
    expect(badMime.ok()).toBe(false);
    const control = await request.get(`${url}/storage/v1/object/authenticated/lead-files/${path.split('/').map(encodeURIComponent).join('/')}`, {
      headers: { apikey: key, Authorization: `Bearer ${ownerToken}` },
    });
    expect(control.status()).toBe(200);
    expect((await control.body()).byteLength).toBe(15 * 1024 * 1024);
  } finally {
    if (metadataCreated) await restDelete(request, ownerToken, 'app_lead_files', `id=eq.${fileId}&company_id=eq.${companyA}`);
    if (objectCreated) {
      const removed = await request.delete(`${url}/storage/v1/object/lead-files`, {
        headers: { apikey: key, Authorization: `Bearer ${ownerToken}`, 'Content-Type': 'application/json' },
        data: { prefixes: [path] },
      });
      expect(removed.ok()).toBe(true);
    }
  }
});
