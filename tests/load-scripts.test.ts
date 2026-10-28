import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import test from 'node:test';

const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');

test('owner load profile uses the requested workload and never targets production', () => {
  const path = new URL('../load/owner-dashboard.js', import.meta.url);
  assert.equal(existsSync(path), true);
  const source = read('../load/owner-dashboard.js');

  assert.match(source, /REQUIRED_OWNER_VUS = 30/);
  assert.match(source, /REQUIRED_EMPLOYEE_VUS = 100/);
  assert.match(source, /vus: REQUIRED_OWNER_VUS/);
  assert.match(source, /vus: REQUIRED_EMPLOYEE_VUS/);
  assert.match(source, /duration:\s*'10m'/);
  assert.match(source, /p\(95\)<800/);
  assert.match(source, /p\(95\)<1500/);
  assert.match(source, /rate<0\.01/);
  assert.match(source, /STAGING_SUPABASE_PROJECT_REF/);
  assert.match(source, /PRODUCTION_SUPABASE_PROJECT_REF/);
  assert.match(source, /STAGING_OWNER_LOAD_FIXTURES_JSON/);
  assert.match(source, /STAGING_EMPLOYEE_LOAD_FIXTURES_JSON/);
  assert.match(source, /STAGING_OWNER_LOAD_FIXTURES_FILE/);
  assert.match(source, /STAGING_EMPLOYEE_LOAD_FIXTURES_FILE/);
  assert.match(source, /open\(filePath\)/);
  assert.match(source, /app_leads/);
  assert.match(source, /api\/import-leads/);
  assert.match(source, /CSV_DRY_RUN_ROWS = 500/);
  assert.match(source, /body\.rows === CSV_DRY_RUN_ROWS/);
  assert.match(source, /validateStagingPreview/);
  assert.match(source, /validateLoadFixtures\(owners, employees, tokenClaims\)/);
  assert.match(source, /verifyMembership\(fixture, 'owner', environment\)/);
  assert.match(source, /verifyMembership\(fixture, 'employee', environment\)/);
  assert.match(source, /app_members\?select=user_id,role,active/);
});

test('employee load VUs do not perform forward-only status writes or attempt to restore them', () => {
  const source = read('../load/owner-dashboard.js');
  const ownerFlow = source.match(/export function ownerFlow\(data\) \{([\s\S]*?)\n\}/)?.[1] || '';
  const employeeFlow = source.match(/export function employeeFlow\(data\) \{([\s\S]*?)\n\}/)?.[1] || '';
  const teardown = source.match(/export function teardown\(data\) \{([\s\S]*?)\n\}/)?.[1] || '';

  assert.match(ownerFlow, /includeWrites:\s*true/);
  assert.match(ownerFlow, /includeCsv:\s*true/);
  assert.match(employeeFlow, /includeWrites:\s*false/);
  assert.match(employeeFlow, /includeCsv:\s*false/);
  assert.match(teardown, /data\.owners/);
  assert.doesNotMatch(teardown, /data\.employees/);
});

test('load fixtures require distinct synthetic users and roles bound to their signed JWT identity and tenant', async () => {
  const validator = await import('../scripts/validate-load-fixtures.mjs').catch(() => ({})) as {
    validateLoadFixtures?: (
      owners: Array<{ companyId: string; userId: string; role: string; accessToken: string }>,
      employees: Array<{ companyId: string; userId: string; role: string; accessToken: string }>,
      claimsFor: (token: string) => { sub: string; app_metadata: { tenant_id: string } },
    ) => void;
  };
  assert.equal(typeof validator.validateLoadFixtures, 'function');
  const validate = validator.validateLoadFixtures!;
  const owners = [
    { companyId: 'company-a', userId: 'user-a', role: 'owner', accessToken: 'secret-a' },
  ];
  const employees = [
    { companyId: 'company-b', userId: 'user-b', role: 'employee', accessToken: 'secret-b' },
  ];
  const claimsFor = (token: string) => token === 'secret-a'
    ? { sub: 'user-a', app_metadata: { tenant_id: 'company-a' } }
    : { sub: 'user-b', app_metadata: { tenant_id: 'company-b' } };
  assert.doesNotThrow(() => validate(owners, employees, claimsFor));
  assert.throws(() => validate(owners, [{ ...employees[0], companyId: 'company-a' }], claimsFor), /distinct company IDs/);
  assert.throws(() => validate(owners, [{ ...employees[0], userId: 'user-a' }], claimsFor), /distinct Auth user IDs/);
  assert.throws(() => validate(owners, [{ ...employees[0], role: 'owner' }], claimsFor), /employee fixtures must declare employee role/i);
  assert.throws(() => validate([{ ...owners[0], accessToken: 'secret-c' }], employees, claimsFor), /does not match its fixture user or tenant/i);
  assert.throws(() => validate(owners, [{ ...employees[0], accessToken: 'secret-a' }], claimsFor), (error: Error) => {
    assert.match(error.message, /distinct access tokens/);
    assert.doesNotMatch(error.message, /secret-a/);
    return true;
  });
});

test('public intake load profile sends 200 unique synthetic requests in one minute and accounts for rate limits', () => {
  const path = new URL('../load/public-intake.js', import.meta.url);
  assert.equal(existsSync(path), true);
  const source = read('../load/public-intake.js');

  assert.match(source, /rate:\s*200/);
  assert.match(source, /timeUnit:\s*'1m'/);
  assert.match(source, /duration:\s*'1m'/);
  assert.match(source, /request_key/);
  assert.match(source, /429/);
  assert.match(source, /PRODUCTION_SUPABASE_PROJECT_REF/);
  assert.match(source, /STAGING_PUBLIC_TENANT_KEY/);
  assert.match(source, /validateStagingPreview/);
});

test('load report distinguishes unavailable measurements from threshold passes', () => {
  const report = read('../docs/load-results.md');
  assert.match(report, /NOT RUN/);
  assert.match(report, /p95 `< 800 ms`/);
  assert.match(report, /p95 `< 1500 ms`/);
  assert.match(report, /`< 1%`/);
  assert.match(report, /synthetic identities/i);
  assert.match(report, /fixture files/i);
});
