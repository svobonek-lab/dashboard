import { randomUUID } from 'node:crypto';
import { expect, test } from 'playwright/test';
import { accessToken, requiredValue, restGet, stagingConfig } from './support';

test('replaying a synthetic public inquiry with one request key creates one lead', async ({ request }) => {
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

  const owner = await accessToken(request, 'OWNER_A');
  const params = new URLSearchParams({
    select: 'id',
    company_id: `eq.${companyId}`,
    title: `eq.${title}`,
  });
  const matches = await restGet(request, owner, 'app_leads', params.toString());
  expect(matches).toHaveLength(1);
});
