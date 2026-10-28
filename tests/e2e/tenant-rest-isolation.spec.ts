import { expect, test } from 'playwright/test';
import { accessToken, requiredValue, restGet, restPatch, stagingConfig } from './support';

test('owner JWT cannot read another synthetic company through PostgREST', async ({ request }) => {
  stagingConfig();
  const companyA = requiredValue('STAGING_COMPANY_A_ID');
  const companyB = requiredValue('STAGING_COMPANY_B_ID');
  expect(companyA).not.toBe(companyB);
  const [ownerA, employeeA, ownerB] = await Promise.all([
    accessToken(request, 'OWNER_A'),
    accessToken(request, 'EMPLOYEE_A'),
    accessToken(request, 'OWNER_B'),
  ]);

  const resources = [
    { table: 'app_leads', filter: 'company_id', ownerControl: true },
    { table: 'app_notes', filter: 'company_id', ownerControl: true },
    { table: 'app_members', filter: 'company_id', ownerControl: true },
    { table: 'app_invites', filter: 'company_id', ownerControl: true },
    { table: 'app_companies', filter: 'id', ownerControl: true },
    { table: 'app_audit', filter: 'company_id', ownerControl: true },
  ] as const;
  const matrix: Array<{ resource: string; operation: string; result: string }> = [];

  for (const resource of resources) {
    const query = new URLSearchParams({ select: 'id', [resource.filter]: `eq.${companyB}` }).toString();
    const [ownerRows, employeeRows] = await Promise.all([
      restGet(request, ownerA, resource.table, query),
      restGet(request, employeeA, resource.table, query),
    ]);
    expect(ownerRows, `Owner A can see company B rows in ${resource.table}.`).toHaveLength(0);
    expect(employeeRows, `Employee A can see company B rows in ${resource.table}.`).toHaveLength(0);
    matrix.push(
      { resource: resource.table, operation: 'SELECT as owner A', result: '0 rows' },
      { resource: resource.table, operation: 'SELECT as employee A', result: '0 rows' },
    );

    if (resource.ownerControl) {
      const ownerBRows = await restGet(request, ownerB, resource.table, query);
      expect(ownerBRows.length, `Owner B fixture is missing from ${resource.table}; refusing a vacuous isolation pass.`).toBeGreaterThan(0);
      matrix.push({ resource: resource.table, operation: 'SELECT as owner B control', result: `${ownerBRows.length} row(s)` });
    }
  }

  const companyQuery = new URLSearchParams({ select: 'id,name', id: `eq.${companyB}` }).toString();
  const companyBefore = await restGet(request, ownerB, 'app_companies', companyQuery);
  expect(companyBefore).toHaveLength(1);
  const profilePatch = await restPatch(
    request,
    ownerA,
    'app_companies',
    `id=eq.${encodeURIComponent(companyB)}`,
    { name: companyBefore[0].name },
  );
  const profileBody = await profilePatch.text();
  const profileRejectedOrFiltered = [401, 403, 404].includes(profilePatch.status())
    || (profilePatch.ok() && (!profileBody.trim() || JSON.parse(profileBody).length === 0));
  expect(profileRejectedOrFiltered, `Cross-company profile UPDATE unexpectedly returned HTTP ${profilePatch.status()} with a row.`).toBe(true);
  const companyAfter = await restGet(request, ownerB, 'app_companies', companyQuery);
  expect(companyAfter).toHaveLength(1);
  expect(companyAfter[0].name).toBe(companyBefore[0].name);
  matrix.push({ resource: 'app_companies (company B)', operation: 'UPDATE profile as owner A', result: `unchanged (${profilePatch.status()})` });

  test.info().annotations.push({ type: 'tenant-isolation-matrix', description: JSON.stringify(matrix) });
  console.info('Tenant isolation matrix\n' + matrix.map(row => `${row.resource} | ${row.operation} | ${row.result}`).join('\n'));
});

test('employee A cannot read or change the synthetic company B lead assigned to employee B', async ({ request }) => {
  stagingConfig();
  const companyA = requiredValue('STAGING_COMPANY_A_ID');
  const companyB = requiredValue('STAGING_COMPANY_B_ID');
  const leadB = requiredValue('STAGING_LEAD_B_ID');
  const employeeB = requiredValue('STAGING_EMPLOYEE_B_ID');
  expect(companyA).not.toBe(companyB);

  const [employeeAToken, ownerBToken] = await Promise.all([
    accessToken(request, 'EMPLOYEE_A'),
    accessToken(request, 'OWNER_B'),
  ]);
  const leadBQuery = new URLSearchParams({
    select: 'id,company_id,title,status,assigned_to',
    id: `eq.${leadB}`,
    company_id: `eq.${companyB}`,
  }).toString();
  const ownerBefore = await restGet(request, ownerBToken, 'app_leads', leadBQuery);
  expect(ownerBefore).toHaveLength(1);
  expect(ownerBefore[0].assigned_to).toBe(employeeB);

  const employeeARead = await restGet(request, employeeAToken, 'app_leads', leadBQuery);
  expect(employeeARead).toHaveLength(0);

  const attemptedStatus = ownerBefore[0].status === 'contacted' ? 'lost' : 'contacted';
  const patch = await restPatch(
    request,
    employeeAToken,
    'app_leads',
    `id=eq.${encodeURIComponent(leadB)}&company_id=eq.${encodeURIComponent(companyB)}`,
    { status: attemptedStatus },
  );
  const patchBody = await patch.text();
  const rejectedOrFiltered = [401, 403, 404].includes(patch.status())
    || (patch.ok() && (!patchBody.trim() || JSON.parse(patchBody).length === 0));
  expect(rejectedOrFiltered, `Cross-company status mutation unexpectedly returned HTTP ${patch.status()} with a representation.`).toBe(true);

  const ownerAfter = await restGet(request, ownerBToken, 'app_leads', leadBQuery);
  expect(ownerAfter).toHaveLength(1);
  expect(ownerAfter[0].status).toBe(ownerBefore[0].status);
  expect(ownerAfter[0].assigned_to).toBe(employeeB);

  const matrix = [
    { resource: 'app_leads (company B)', operation: 'SELECT as employee A', result: '0 rows' },
    { resource: 'app_leads (employee B assigned lead)', operation: 'UPDATE status as employee A', result: `unchanged (${patch.status()})` },
    { resource: 'app_leads (company B)', operation: 'independent SELECT as owner B', result: 'fixture remains visible and unchanged' },
  ];
  test.info().annotations.push({ type: 'tenant-isolation-matrix', description: JSON.stringify(matrix) });
  console.info('Tenant isolation matrix\n' + matrix.map(row => `${row.resource} | ${row.operation} | ${row.result}`).join('\n'));
});
