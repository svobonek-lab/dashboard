import { expect, test } from 'playwright/test';
import { accessToken, requiredValue, restGet, stagingConfig } from './support';

test('owner JWT cannot read another synthetic company through PostgREST', async ({ request }) => {
  stagingConfig();
  const companyA = requiredValue('STAGING_COMPANY_A_ID');
  const companyB = requiredValue('STAGING_COMPANY_B_ID');
  expect(companyA).not.toBe(companyB);
  const [ownerA, ownerB] = await Promise.all([
    accessToken(request, 'OWNER_A'),
    accessToken(request, 'OWNER_B'),
  ]);

  const otherTenantQuery = new URLSearchParams({ select: 'id', company_id: `eq.${companyB}` });
  const ownTenantQuery = new URLSearchParams({ select: 'id', company_id: `eq.${companyB}` });
  const [foreignRows, ownedRows] = await Promise.all([
    restGet(request, ownerA, 'app_leads', otherTenantQuery.toString()),
    restGet(request, ownerB, 'app_leads', ownTenantQuery.toString()),
  ]);

  expect(foreignRows).toHaveLength(0);
  expect(ownedRows.length).toBeGreaterThan(0);
});
