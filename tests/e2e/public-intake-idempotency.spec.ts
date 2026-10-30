import { randomUUID } from 'node:crypto';
import { expect, test } from 'playwright/test';
import { accessToken, requiredValue, restGet, stagingConfig } from './support';

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
