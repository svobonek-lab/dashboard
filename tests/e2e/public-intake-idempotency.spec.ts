import { randomUUID } from 'node:crypto';
import { expect, test } from 'playwright/test';
import { accessToken, requiredValue, restGet, signIn, stagingConfig } from './support';

test('replaying a synthetic public inquiry with one request key creates one lead', async ({ browser, request }) => {
  test.skip(!(process.env.STAGING_PUBLIC_INTAKE_ENABLED === 'true'), 'Public intake is awaiting the reviewed staging SQL and synthetic tenant enablement.');
  const { preview } = stagingConfig();
  const companyId = requiredValue('STAGING_COMPANY_A_ID');
  const publicKey = requiredValue('STAGING_PUBLIC_TENANT_KEY');
  const title = `Playwright idempotency ${randomUUID()}`;
  const requestKey = randomUUID();
  const body = {
    public_key: publicKey,
    request_key: requestKey,
    customer: 'Synthetic Playwright inquiry',
    phone: '+420700000000',
    email: `playwright-${requestKey}@example.test`,
    title,
    description: 'Automated staging idempotency acceptance; synthetic data only.',
    value: 0,
    website: '',
  };

  const first = await request.post(`${preview}/api/public-intake`, { data: body });
  const replay = await request.post(`${preview}/api/public-intake`, { data: body });
  expect(first.status()).toBe(200);
  expect(replay.status()).toBe(200);
  const [firstBody, replayBody] = await Promise.all([first.text(), replay.text()]);
  for (const responseBody of [firstBody, replayBody]) {
    expect(responseBody).not.toContain('StavbaFlow E2E Isolation Lead B');
    expect(responseBody).not.toContain('e2e-lead-b@stavbaflow.example.test');
    expect(responseBody).not.toContain(requiredValue('STAGING_COMPANY_B_ID'));
  }

  const owner = await accessToken(browser, 'OWNER_A');
  const params = new URLSearchParams({
    select: 'id',
    company_id: `eq.${companyId}`,
    title: `eq.${title}`,
  });
  const matches = await restGet(request, owner, 'app_leads', params.toString());
  expect(matches).toHaveLength(1);
  const matrix = [
    { resource: 'public intake response', operation: 'cross-company B data check', result: 'no company B marker or ID returned' },
    { resource: 'public intake lead', operation: 'idempotent duplicate submit', result: `${matches.length} synthetic company A lead` },
  ];
  test.info().annotations.push({ type: 'tenant-isolation-matrix', description: JSON.stringify(matrix) });
  console.info('Tenant isolation matrix\n' + matrix.map(row => `${row.resource} | ${row.operation} | ${row.result}`).join('\n'));
});

test('public intake rejects oversized fields and silently drops honeypot submissions', async ({ browser, request }) => {
  test.skip(!(process.env.STAGING_PUBLIC_INTAKE_ENABLED === 'true'), 'Public intake is awaiting the reviewed staging SQL and synthetic tenant enablement.');
  const { preview } = stagingConfig();
  const companyId = requiredValue('STAGING_COMPANY_A_ID');
  const publicKey = requiredValue('STAGING_PUBLIC_TENANT_KEY');
  const oversized = await request.post(`${preview}/api/public-intake`, { data: {
    public_key: publicKey,
    request_key: randomUUID(),
    customer: 'Synthetic Playwright inquiry',
    phone: '+420700000000',
    email: 'oversized@example.test',
    title: 'X'.repeat(121),
    description: 'Automated staging oversized-field check.',
    value: 0,
    website: '',
  } });
  expect(oversized.status()).toBe(400);
  expect(await oversized.json()).toEqual({ error: 'invalid_public_intake' });

  const honeypotTitle = `Playwright honeypot ${randomUUID()}`;
  const honeypot = await request.post(`${preview}/api/public-intake`, { data: {
    public_key: publicKey,
    request_key: randomUUID(),
    customer: 'Synthetic Playwright bot',
    phone: '+420700000000',
    email: 'honeypot@example.invalid',
    title: honeypotTitle,
    description: 'Automated staging honeypot check.',
    value: 0,
    website: 'https://spam.example.invalid',
  } });
  expect(honeypot.status()).toBe(202);
  expect(await honeypot.json()).toEqual({ status: 'accepted' });

  const owner = await accessToken(browser, 'OWNER_A');
  const params = new URLSearchParams({ select: 'id', company_id: `eq.${companyId}`, title: `eq.${honeypotTitle}` });
  expect(await restGet(request, owner, 'app_leads', params.toString())).toHaveLength(0);
});

test('the synthetic public form and the three roles process one lead end to end', async ({ browser, request }) => {
  test.skip(process.env.STAGING_PUBLIC_FORM_ACCEPTANCE !== 'true', 'Requires the exact intake Preview and synthetic fixtures.');
  test.setTimeout(100_000);
  const { preview } = stagingConfig();
  const company = requiredValue('STAGING_COMPANY_A_ID');
  const slug = requiredValue('STAGING_PUBLIC_TENANT_KEY');
  const run = randomUUID();
  const customer = `Synthetic public form ${run}`;
  const project = 'Pergola nebo terasa';
  const [publicContext, ownerContext, employeeContext] = await Promise.all(
    Array.from({ length: 3 }, () => browser.newContext({ baseURL: preview })),
  );
  console.info(`Public intake cleanup marker: ${run}`);
  try {
    const visitor = await publicContext.newPage();
    const owner = await ownerContext.newPage();
    const employee = await employeeContext.newPage();
    for (const page of [visitor, owner, employee]) page.setDefaultTimeout(15_000);
    const [ownerToken, employeeToken, ownerB] = await Promise.all(
      (['OWNER_A', 'EMPLOYEE_A', 'OWNER_B'] as const).map(account => accessToken(browser, account)),
    );
    for (const [token, account, tenant] of [
      [ownerToken, 'OWNER_A', company], [employeeToken, 'EMPLOYEE_A', company],
      [ownerB, 'OWNER_B', requiredValue('STAGING_COMPANY_B_ID')],
    ]) {
      const claims = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
      expect(claims.sub, `synthetic ${account} identity`).toBe(requiredValue(`STAGING_${account}_ID`));
      expect(claims.app_metadata?.tenant_id, `synthetic ${account} tenant`).toBe(tenant);
    }

    for (const key of [`invalid-${run}`, 'e2e-synthetic-company-b']) {
      await visitor.goto(`/inquiry/${key}`);
      await expect(visitor.getByRole('heading', { name: 'Formulář není dostupný' })).toBeVisible();
      await expect(visitor.getByRole('button', { name: 'Odeslat poptávku' })).toHaveCount(0);
    }
    await visitor.goto(`/inquiry/${slug}`);
    const submit = visitor.getByRole('button', { name: 'Odeslat poptávku' });
    await expect(submit).toBeVisible();
    await submit.click();
    await expect(visitor.getByRole('alert')).toContainText('Doplňte jméno');
    await visitor.getByLabel('Jméno a příjmení').fill(customer);
    await visitor.getByLabel('Telefon').fill('+420700000000');
    await visitor.getByLabel('E-mail').fill(`intake-${run}@example.invalid`);
    await visitor.getByLabel('Typ práce').selectOption(project);
    await visitor.getByLabel('Stručný popis').fill(`Synthetic intake run ${run}`);
    await visitor.getByRole('checkbox').check();
    const reply = visitor.waitForResponse(r => r.url() === `${preview}/api/public-intake` && r.request().method() === 'POST');
    const dispatch = visitor.waitForResponse(r => r.url() === `${preview}/api/outbox-dispatch` && r.request().method() === 'POST');
    const [result, dispatchResult] = await Promise.all([reply, dispatch, submit.dblclick()]);
    console.info(`Intake browser responses: form=${result.status()}, dispatch=${dispatchResult.status()}`);
    expect(result.status(), 'the real intake API must accept').toBe(200);
    expect(dispatchResult.status(), 'optional staging worker must be unavailable').toBe(503);
    const body = result.request().postDataJSON() as Record<string, unknown>;
    await expect(visitor.getByRole('heading', { name: 'Poptávka byla přijata' })).toBeVisible();
    console.info('Intake browser confirmation visible. Replaying the exact request key.');

    const endpoint = `${preview}/api/public-intake`;
    const replay = await request.post(endpoint, { data: body, timeout: 15_000 });
    expect(replay.status()).toBe(200);
    expect(await replay.json()).toEqual({ status: 'accepted' });
    const query = new URLSearchParams({ select: 'id,company_id,source,status,assigned_to', customer: `eq.${customer}` });
    const rows = await restGet(request, ownerToken, 'app_leads', query.toString());
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ company_id: company, source: 'public_form', status: 'new', assigned_to: null });
    const id = String(rows[0].id);
    expect(await restGet(request, ownerB, 'app_leads', query.toString())).toEqual([]);
    expect(await restGet(request, ownerB, 'app_lead_events', `lead_id=eq.${id}&select=id`)).toEqual([]);

    const missing = await request.post(endpoint, { data: { ...body, request_key: randomUUID(), phone: '' }, timeout: 15_000 });
    expect(missing.status()).toBe(400);
    expect(await missing.json()).toEqual({ error: 'invalid_public_intake' });
    for (const key of [`invalid-${run}`, 'e2e-synthetic-company-b']) {
      const denied = await request.post(endpoint, { data: { ...body, public_key: key, request_key: randomUUID() }, timeout: 15_000 });
      expect(denied.status()).toBe(503);
      expect(await denied.json()).toEqual({ error: 'public_intake_unavailable' });
    }

    let rateLimited = false;
    let accepted = 0;
    for (let i = 0; i < 6; i++) {
      const burst = await request.post(endpoint, { data: { ...body, customer: `Synthetic burst ${run}`, request_key: `test-${run}-${i}` }, timeout: 15_000 });
      if (burst.status() === 429) {
        expect(await burst.json()).toEqual({ error: 'rate_limited' });
        expect(burst.headers()['retry-after']).toBe('600');
        rateLimited = true;
        break;
      }
      expect(burst.status()).toBe(200);
      expect(await burst.json()).toEqual({ status: 'accepted' });
      accepted++;
    }
    expect(rateLimited).toBe(true);
    expect(accepted).toBeLessThanOrEqual(5);
    console.info(`Intake throttle evidence: ${accepted} fresh accepts before HTTP 429`);

    await owner.route('**/api/outbox-dispatch', route => route.fulfill({ status: 503, json: { code: 'OUTBOX_WORKER_NOT_CONFIGURED', processedCount: 0 } }));
    await signIn(owner, 'OWNER_A');
    await owner.goto('/leads');
    const open = () => owner.getByText(customer, { exact: true }).first().click();
    await open();
    const assignee = requiredValue('STAGING_EMPLOYEE_A_ID');
    await owner.getByLabel('Přiřazení').selectOption(assignee);
    await owner.getByRole('button', { name: 'Uložit přiřazení' }).click();
    await expect(owner.getByRole('status').filter({ hasText: 'Zakázka je přiřazena:' })).toBeVisible();
    await owner.reload();
    await open();
    await expect(owner.getByLabel('Přiřazení')).toHaveValue(assignee);
    await expect(owner.getByText('Zakázka přiřazena pracovníkovi', { exact: true })).toBeVisible();

    await signIn(employee, 'EMPLOYEE_A');
    await employee.goto('/employee/dashboard');
    const card = employee.getByRole('article').filter({ hasText: customer });
    await card.getByRole('button', { name: 'Potvrdit kontakt' }).click();
    await expect(card.getByRole('button', { name: 'Předat do nabídky' })).toBeVisible();
    await owner.reload();
    await open();
    await expect(owner.getByText('Stav zakázky změněn na: Kontaktováno', { exact: true })).toBeVisible();
    expect((await restGet(request, ownerToken, 'app_leads', query.toString()))[0]).toMatchObject({
      id, status: 'contacted', assigned_to: assignee,
    });
  } finally {
    await Promise.all([publicContext.close(), ownerContext.close(), employeeContext.close()]);
  }
});
