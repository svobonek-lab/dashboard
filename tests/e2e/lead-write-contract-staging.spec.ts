import { randomUUID } from 'node:crypto';
import { expect, test } from 'playwright/test';
import { accessToken, requiredValue, restGet, restRpc, signIn, stagingConfig } from './support';

test('owner creates and assigns, employee persists status, and owner B is denied', async ({ browser, request }) => {
  test.skip(process.env.STAGING_LEAD_WRITE_ACCEPTANCE !== 'true', 'Requires the reviewed lead write staging Preview.');
  test.setTimeout(120_000);
  const { preview } = stagingConfig();
  const company = requiredValue('STAGING_COMPANY_A_ID');
  const employeeId = requiredValue('STAGING_EMPLOYEE_A_ID');
  const title = `Synthetic lead write acceptance ${randomUUID()}`;
  const ownerSession = await browser.newContext({ baseURL: preview });
  const employeeSession = await browser.newContext({ baseURL: preview });
  const owner = await ownerSession.newPage();
  const employee = await employeeSession.newPage();
  try {
    // This acceptance checks database and browser persistence, without dispatching emails.
    await owner.route('**/api/outbox-dispatch', route => route.fulfill({ status: 503, json: { code: 'EMAIL_PROVIDER_NOT_CONFIGURED' } }));
    const ownerToken = await accessToken(browser, 'OWNER_A');
    const ownerBToken = await accessToken(browser, 'OWNER_B');
    await signIn(owner, 'OWNER_A');
    await owner.goto('/leads');
    await owner.getByRole('button', { name: 'Nová zakázka / Poptávka' }).click();
    await owner.getByPlaceholder('Např. Pergola na míru').fill(title);
    await owner.getByPlaceholder('Ing. Petr Novák').fill('Synthetic owner fixture');
    await owner.getByPlaceholder('+420 777 123 456').fill('+420 777 000 000');
    await owner.getByPlaceholder('klient@email.cz').fill('lead-write@example.invalid');
    await owner.getByPlaceholder('250000').fill('100');
    await owner.getByPlaceholder('Ulice 12, Město').fill('Synthetic staging address');
    const persistedCreate = owner.waitForResponse(r => r.url().endsWith('/rpc/app_create_lead') && r.request().method() === 'POST');
    await owner.getByRole('button', { name: 'Vytvořit zakázku' }).click();
    const created = await persistedCreate;
    expect(created.ok()).toBe(true);
    const { id } = await created.json() as { id: string };
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    console.info(`Stage cleanup fixture: ${company} / ${id} / ${title}`);

    await owner.reload();
    await owner.getByText(title, { exact: true }).first().click();
    await expect(owner.getByText('Poptávka vytvořena', { exact: true })).toBeVisible();
    await owner.getByLabel('Přiřazení').selectOption(employeeId);
    await owner.getByRole('button', { name: 'Uložit přiřazení' }).click();
    await expect(owner.getByRole('status').filter({ hasText: 'Zakázka je přiřazena:' })).toBeVisible();
    await owner.reload();
    await owner.getByText(title, { exact: true }).first().click();
    await expect(owner.getByLabel('Přiřazení')).toHaveValue(employeeId);
    await expect(owner.getByText('Zakázka přiřazena pracovníkovi', { exact: true })).toBeVisible();

    await signIn(employee, 'EMPLOYEE_A');
    await employee.goto('/employee/dashboard');
    const card = employee.getByRole('article').filter({ has: employee.getByRole('heading', { name: title }) });
    const advance = card.getByRole('button', { name: 'Potvrdit kontakt' });
    await employee.route('**/rpc/app_set_lead_status', route => route.fulfill({ status: 403, json: { code: '42501', message: 'Synthetic rejection' } }));
    await advance.click();
    await expect(employee.getByText(/Nepodařilo se uložit změnu stavu/)).toBeVisible();
    await expect(advance).toBeVisible();
    const byId = `id=eq.${id}&select=status,assigned_to`;
    expect(await restGet(request, ownerToken, 'app_leads', byId)).toEqual([{ status: 'new', assigned_to: employeeId }]);
    await employee.unroute('**/rpc/app_set_lead_status');
    await advance.click();
    await expect(card.getByRole('button', { name: 'Předat do nabídky' })).toBeVisible();
    await employee.reload();
    await card.getByRole('button', { name: 'Otevřít detail' }).click();
    await expect(employee.getByText('Stav zakázky změněn na: Kontaktováno', { exact: true })).toBeVisible();

    const denied = await restRpc(request, ownerBToken, 'app_assign_lead', { p_lead_id: id, p_employee_id: null });
    expect(denied.status()).toBe(403);
    expect((await denied.json()).code).toBe('42501');
    expect(await restGet(request, ownerBToken, 'app_leads', byId)).toEqual([]);
    expect(await restGet(request, ownerBToken, 'app_lead_events', `lead_id=eq.${id}&select=id`)).toEqual([]);
    expect(await restGet(request, ownerToken, 'app_leads', byId)).toEqual([{ status: 'contacted', assigned_to: employeeId }]);
  } finally {
    await Promise.all([ownerSession.close(), employeeSession.close()]);
  }
});
