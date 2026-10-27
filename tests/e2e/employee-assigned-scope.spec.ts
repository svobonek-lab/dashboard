import { expect, test } from 'playwright/test';
import { accessToken, requiredValue, restGet, stagingConfig } from './support';

test('employee REST session returns only leads assigned to that synthetic employee', async ({ request }) => {
  stagingConfig();
  const companyId = requiredValue('STAGING_COMPANY_A_ID');
  const employeeId = requiredValue('STAGING_EMPLOYEE_A_ID');
  const token = await accessToken(request, 'EMPLOYEE_A');
  const params = new URLSearchParams({
    select: 'id,company_id,assigned_to',
    company_id: `eq.${companyId}`,
  });
  const leads = await restGet(request, token, 'app_leads', params.toString());

  expect(leads.length).toBeGreaterThan(0);
  expect(leads.every((lead) => lead.company_id === companyId && lead.assigned_to === employeeId)).toBe(true);
});
