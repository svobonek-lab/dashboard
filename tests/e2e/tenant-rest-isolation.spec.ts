import { randomUUID } from 'node:crypto';
import { expect, test } from 'playwright/test';
import { accessToken, requiredValue, restDelete, restGet, restInsert, restPatch, stagingConfig } from './support';

type TenantRow = Record<string, unknown>;
type TenantResource = {
  table: string;
  crossTenantSelect?: string;
  crossTenantQuery: string;
  controlQuery: string;
  rowFilter(row: TenantRow): string;
  updateField: string;
  stableFields: string[];
};

async function assertMutationDeniedOrFiltered(response: Awaited<ReturnType<typeof restInsert>>, label: string): Promise<string> {
  const status = response.status();
  const body = await response.text();
  if ([401, 403, 404].includes(status)) return `HTTP ${status}`;
  if (response.ok() && body.trim()) {
    try {
      const rows = JSON.parse(body) as unknown;
      if (Array.isArray(rows) && rows.length === 0) return `HTTP ${status}, 0 rows`;
    } catch { /* An unparseable successful body cannot prove a filtered write. */ }
  }
  throw new Error(`${label} was not rejected or filtered: HTTP ${status}, body length ${body.length}.`);
}

function eq(value: unknown) {
  return `eq.${encodeURIComponent(String(value))}`;
}

test('owner A and employee A cannot read or mutate company B synthetic rows through PostgREST', async ({ browser, request }) => {
  stagingConfig();
  const companyA = requiredValue('STAGING_COMPANY_A_ID');
  const companyB = requiredValue('STAGING_COMPANY_B_ID');
  const ownerBId = requiredValue('STAGING_OWNER_B_ID');
  const employeeBId = requiredValue('STAGING_EMPLOYEE_B_ID');
  const leadBId = requiredValue('STAGING_LEAD_B_ID');
  expect(companyA).not.toBe(companyB);
  const [ownerA, employeeA, ownerB] = await Promise.all([
    accessToken(browser, 'OWNER_A'),
    accessToken(browser, 'EMPLOYEE_A'),
    accessToken(browser, 'OWNER_B'),
  ]);

  const companyFilter = `company_id=${eq(companyB)}`;
  const resources: TenantResource[] = [
    {
      table: 'app_leads', crossTenantQuery: companyFilter,
      controlQuery: `id=${eq(leadBId)}&${companyFilter}`,
      rowFilter: row => `id=${eq(row.id)}&${companyFilter}`,
      updateField: 'title', stableFields: ['title', 'status', 'assigned_to'],
    },
    {
      table: 'app_notes', crossTenantQuery: companyFilter,
      controlQuery: `company_id=${eq(companyB)}&lead_id=${eq(leadBId)}&body=${eq('Synthetic E2E isolation note B')}`,
      rowFilter: (row: TenantRow) => `id=${eq(row.id)}&${companyFilter}`,
      updateField: 'body', stableFields: ['body', 'lead_id', 'author'],
    },
    ...(process.env.STAGING_LEAD_B_FILE_PATH ? [
      {
        table: 'app_lead_files', crossTenantQuery: companyFilter,
        controlQuery: `company_id=${eq(companyB)}&lead_id=${eq(leadBId)}&storage_path=${eq(process.env.STAGING_LEAD_B_FILE_PATH)}`,
        rowFilter: (row: TenantRow) => `id=${eq(row.id)}&${companyFilter}`,
        updateField: 'file_name', stableFields: ['file_name', 'storage_path', 'lead_id', 'author_id'],
      },
    ] : []),
    {
      table: 'app_members', crossTenantQuery: companyFilter, crossTenantSelect: 'company_id,user_id',
      controlQuery: `company_id=${eq(companyB)}&user_id=${eq(employeeBId)}`,
      rowFilter: row => `company_id=${eq(row.company_id)}&user_id=${eq(row.user_id)}`,
      updateField: 'name', stableFields: ['name', 'email', 'role', 'active'],
    },
    {
      table: 'app_invites', crossTenantQuery: companyFilter,
      controlQuery: `company_id=${eq(companyB)}&email=${eq('e2e-isolation-invite-b@stavbaflow.example.test')}`,
      rowFilter: row => `id=${eq(row.id)}&${companyFilter}`,
      updateField: 'role', stableFields: ['email', 'name', 'role', 'expires_at'],
    },
    {
      table: 'app_companies', crossTenantQuery: `id=${eq(companyB)}`,
      controlQuery: `id=${eq(companyB)}`,
      rowFilter: row => `id=${eq(row.id)}`,
      updateField: 'name', stableFields: ['name', 'slug', 'active'],
    },
    {
      table: 'app_audit', crossTenantQuery: companyFilter,
      controlQuery: `company_id=${eq(companyB)}&actor=${eq(ownerBId)}&action=${eq('E2E_ISOLATION_FIXTURE')}&entity_id=${eq(leadBId)}`,
      rowFilter: row => `id=${eq(row.id)}&${companyFilter}`,
      updateField: 'action', stableFields: ['actor', 'action', 'entity_id'],
    },
  ];
  const matrix: Array<{ resource: string; operation: string; result: string }> = [];

  for (const resource of resources) {
    const query = new URLSearchParams({ select: resource.crossTenantSelect ?? 'id', ...Object.fromEntries(new URLSearchParams(resource.crossTenantQuery)) }).toString();
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

    const controls = await restGet(request, ownerB, resource.table, `select=*&${resource.controlQuery}`);
    expect(controls, `Owner B synthetic control is missing from ${resource.table}; refusing a vacuous isolation pass.`).toHaveLength(1);
    const control = controls[0];
    matrix.push({ resource: resource.table, operation: 'SELECT as owner B control', result: '1 synthetic row' });

    const actors = [
      { name: 'owner A', token: ownerA, id: requiredValue('STAGING_OWNER_A_ID') },
      { name: 'employee A', token: employeeA, id: requiredValue('STAGING_EMPLOYEE_A_ID') },
    ];
    for (const actor of actors) {
      const insertProbe = { ...control };
      const probeId = randomUUID();
      if (resource.table === 'app_audit') delete insertProbe.id;
      else if ('id' in insertProbe) insertProbe.id = probeId;
      if (resource.table === 'app_members') insertProbe.user_id = actor.id;
      if (resource.table === 'app_invites') insertProbe.email = `e2e-isolation-${probeId}@stavbaflow.example.test`;
      if (resource.table === 'app_lead_files') insertProbe.storage_path = `${companyB}/${leadBId}/e2e-isolation-${probeId}.txt`;
      if (resource.table === 'app_companies') insertProbe.slug = `e2e-isolation-${probeId}`;
      const insert = await restInsert(request, actor.token, resource.table, insertProbe);
      const insertResult = await assertMutationDeniedOrFiltered(insert, `${actor.name} INSERT into ${resource.table}`);
      matrix.push({ resource: resource.table, operation: `INSERT as ${actor.name}`, result: insertResult });

      const update = await restPatch(request, actor.token, resource.table, resource.rowFilter(control), {
        [resource.updateField]: control[resource.updateField],
      });
      const updateResult = await assertMutationDeniedOrFiltered(update, `${actor.name} UPDATE of ${resource.table}`);
      matrix.push({ resource: resource.table, operation: `UPDATE as ${actor.name}`, result: updateResult });

      const deletion = await restDelete(request, actor.token, resource.table, resource.rowFilter(control));
      const deleteResult = await assertMutationDeniedOrFiltered(deletion, `${actor.name} DELETE of ${resource.table}`);
      matrix.push({ resource: resource.table, operation: `DELETE as ${actor.name}`, result: deleteResult });

      const after = await restGet(request, ownerB, resource.table, `select=*&${resource.controlQuery}`);
      expect(after, `${actor.name} changed or deleted the company B ${resource.table} fixture.`).toHaveLength(1);
      for (const field of resource.stableFields) {
        expect(after[0][field], `${actor.name} changed ${resource.table}.${field} in company B.`).toEqual(control[field]);
      }
    }
  }

  test.info().annotations.push({ type: 'tenant-isolation-matrix', description: JSON.stringify(matrix) });
  console.info('Tenant isolation matrix\n' + matrix.map(row => `${row.resource} | ${row.operation} | ${row.result}`).join('\n'));
});

test('owner A and employee A cannot download a company B lead file from private Storage', async ({ browser, request }) => {
  test.skip(!process.env.STAGING_LEAD_B_FILE_PATH, 'Private Storage isolation requires the reviewed notes/files schema and a synthetic company B file fixture.');
  const { url, key } = stagingConfig();
  const companyB = requiredValue('STAGING_COMPANY_B_ID');
  const leadB = requiredValue('STAGING_LEAD_B_ID');
  const path = requiredValue('STAGING_LEAD_B_FILE_PATH');
  expect(path.startsWith(`${companyB}/${leadB}/`), 'File fixture path must be nested under company B and its synthetic lead.').toBe(true);

  const [ownerA, employeeA, ownerB] = await Promise.all([
    accessToken(browser, 'OWNER_A'),
    accessToken(browser, 'EMPLOYEE_A'),
    accessToken(browser, 'OWNER_B'),
  ]);
  const fileQuery = `company_id=${eq(companyB)}&lead_id=${eq(leadB)}&storage_path=${eq(path)}`;
  const ownerRows = await restGet(request, ownerB, 'app_lead_files', `select=id,company_id,lead_id,storage_path&${fileQuery}`);
  expect(ownerRows, 'Company B file metadata fixture is missing; refusing a vacuous Storage isolation pass.').toHaveLength(1);

  const objectPath = path.split('/').map(encodeURIComponent).join('/');
  const download = async (token: string) => request.get(`${url}/storage/v1/object/authenticated/lead-files/${objectPath}`, {
    headers: { apikey: key, Authorization: `Bearer ${token}` },
  });
  const [ownerControl, ownerADownload, employeeADownload] = await Promise.all([
    download(ownerB), download(ownerA), download(employeeA),
  ]);
  expect(ownerControl.status(), 'Owner B must be able to read its synthetic private file control.').toBe(200);
  expect([403, 404], `Owner A unexpectedly downloaded company B file (HTTP ${ownerADownload.status()}).`).toContain(ownerADownload.status());
  expect([403, 404], `Employee A unexpectedly downloaded company B file (HTTP ${employeeADownload.status()}).`).toContain(employeeADownload.status());

  const matrix = [
    { resource: 'app_lead_files', operation: 'SELECT as owner A', result: '0 rows (required fixture check)' },
    { resource: 'Storage lead-files B path', operation: 'download as owner B control', result: 'HTTP 200' },
    { resource: 'Storage lead-files B path', operation: 'download as owner A', result: `HTTP ${ownerADownload.status()}` },
    { resource: 'Storage lead-files B path', operation: 'download as employee A', result: `HTTP ${employeeADownload.status()}` },
  ];
  test.info().annotations.push({ type: 'tenant-isolation-matrix', description: JSON.stringify(matrix) });
  console.info('Tenant isolation matrix\n' + matrix.map(row => `${row.resource} | ${row.operation} | ${row.result}`).join('\n'));
});

test('employee A cannot read or change the synthetic company B lead assigned to employee B', async ({ browser, request }) => {
  stagingConfig();
  const companyA = requiredValue('STAGING_COMPANY_A_ID');
  const companyB = requiredValue('STAGING_COMPANY_B_ID');
  const leadB = requiredValue('STAGING_LEAD_B_ID');
  const employeeB = requiredValue('STAGING_EMPLOYEE_B_ID');
  expect(companyA).not.toBe(companyB);

  const [employeeAToken, ownerBToken] = await Promise.all([
    accessToken(browser, 'EMPLOYEE_A'),
    accessToken(browser, 'OWNER_B'),
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
