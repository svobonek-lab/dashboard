import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';
import encoding from 'k6/encoding';
import { validateK6StagingEnvironment } from './validate-staging.js';
import { validateLoadFixtures } from '../scripts/validate-load-fixtures.mjs';
import { assertK6StagingPreviewTarget } from './assert-staging-preview.js';

const acceptanceErrors = new Rate('acceptance_errors');
const REQUIRED_OWNER_VUS = 30;
const REQUIRED_EMPLOYEE_VUS = 100;
const CSV_DRY_RUN_ROWS = 500;

export const options = {
  scenarios: {
    owners: { executor: 'constant-vus', vus: REQUIRED_OWNER_VUS, duration: '10m', exec: 'ownerFlow' },
    employees: { executor: 'constant-vus', vus: REQUIRED_EMPLOYEE_VUS, duration: '10m', exec: 'employeeFlow' },
  },
  thresholds: {
    'http_req_duration{kind:read}': ['p(95)<800'],
    'http_req_duration{kind:write}': ['p(95)<1500'],
    acceptance_errors: ['rate<0.01'],
    http_req_failed: ['rate<0.01'],
  },
};

function fixtureSource(jsonEnvName, fileEnvName) {
  const inline = String(__ENV[jsonEnvName] || '');
  const filePath = String(__ENV[fileEnvName] || '');
  if (inline && filePath) throw new Error(`Set only one of ${jsonEnvName} or ${fileEnvName}.`);
  if (filePath) {
    try { return open(filePath); } catch { throw new Error(`${fileEnvName} could not be read.`); }
  }
  if (inline) return inline;
  throw new Error(`Set ${fileEnvName} to a private JSON fixture file.`);
}

function parseFixtures(raw, name, count) {
  let fixtures;
  try { fixtures = JSON.parse(raw); } catch { throw new Error(`${name} must contain valid JSON.`); }
  if (!Array.isArray(fixtures) || fixtures.length !== count) {
    throw new Error(`${name} must contain exactly ${count} synthetic load fixtures.`);
  }
  for (const fixture of fixtures) {
    if (!fixture || typeof fixture.accessToken !== 'string' || !fixture.accessToken
      || !isUuid(fixture.companyId) || !isUuid(fixture.userId) || !isUuid(fixture.leadId)
      || !['owner', 'employee'].includes(fixture.role)
      || !['new', 'contacted', 'scheduled', 'in_progress', 'won', 'lost'].includes(fixture.restoreStatus)) {
      throw new Error(`${name} contains an invalid fixture. Expected accessToken, companyId, userId, role, leadId and restoreStatus.`);
    }
  }
  return fixtures;
}

function isUuid(value) {
  return typeof value === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function stagingEnvironment() {
  const target = validateK6StagingEnvironment(__ENV);
  if (!__ENV.STAGING_SUPABASE_PUBLISHABLE_KEY) throw new Error('Missing staging publishable key.');
  return {
    supabaseUrl: target.supabaseUrl,
    previewUrl: target.previewUrl,
    apiKey: __ENV.STAGING_SUPABASE_PUBLISHABLE_KEY,
  };
}

export function setup() {
  const environment = stagingEnvironment();
  assertK6StagingPreviewTarget(environment.previewUrl, __ENV.STAGING_SUPABASE_PROJECT_REF, __ENV.PRODUCTION_SUPABASE_PROJECT_REF);
  const owners = parseFixtures(
    fixtureSource('STAGING_OWNER_LOAD_FIXTURES_JSON', 'STAGING_OWNER_LOAD_FIXTURES_FILE'),
    'STAGING_OWNER_LOAD_FIXTURES_FILE',
    REQUIRED_OWNER_VUS,
  );
  const employees = parseFixtures(
    fixtureSource('STAGING_EMPLOYEE_LOAD_FIXTURES_JSON', 'STAGING_EMPLOYEE_LOAD_FIXTURES_FILE'),
    'STAGING_EMPLOYEE_LOAD_FIXTURES_FILE',
    REQUIRED_EMPLOYEE_VUS,
  );
  validateLoadFixtures(owners, employees, tokenClaims);
  const leadIds = [...owners, ...employees].map(({ leadId }) => leadId);
  if (new Set(leadIds).size !== leadIds.length) throw new Error('Every VU must use a different synthetic lead fixture.');
  for (const fixture of owners) verifyMembership(fixture, 'owner', environment);
  for (const fixture of employees) verifyMembership(fixture, 'employee', environment);
  return { ...environment, owners, employees };
}

function tokenClaims(fixtureToken) {
  const segments = String(fixtureToken || '').split('.');
  if (segments.length !== 3) throw new Error('Invalid staging fixture token.');
  try { return JSON.parse(encoding.b64decode(segments[1], 'rawurl', 's')); }
  catch { throw new Error('Invalid staging fixture token.'); }
}

function verifyMembership(fixture, role, data) {
  const response = http.get(
    `${data.supabaseUrl}/rest/v1/app_members?select=user_id,role,active&company_id=eq.${fixture.companyId}&user_id=eq.${fixture.userId}`,
    { headers: headers(fixture, data.apiKey), tags: { kind: 'setup', operation: 'fixture_membership' } },
  );
  const rows = parseJsonArray(response);
  if (response.status !== 200 || rows.length !== 1 || rows[0].user_id !== fixture.userId
      || rows[0].role !== role || rows[0].active !== true) {
    throw new Error(`A synthetic ${role} load fixture is not an active membership in its declared company.`);
  }
}

function headers(fixture, apiKey) {
  return {
    apikey: apiKey,
    Authorization: `Bearer ${fixture.accessToken}`,
    'Content-Type': 'application/json',
    Prefer: 'return=representation',
  };
}

function record(result, valid) {
  acceptanceErrors.add(!valid);
  check(result, { 'staging acceptance response matches contract': () => valid });
}

function parseJsonArray(response) {
  try { const body = response.json(); return Array.isArray(body) ? body : []; } catch { return []; }
}

function runRead(fixture, data, path, expectedId, label) {
  const response = http.get(`${data.supabaseUrl}/rest/v1/${path}`, {
    headers: headers(fixture, data.apiKey),
    tags: { kind: 'read', operation: label },
  });
  const rows = parseJsonArray(response);
  const valid = response.status === 200 && rows.some((row) => row.id === expectedId && row.company_id === fixture.companyId);
  record(response, valid);
}

function csvFor(vu, iteration) {
  const rows = ['customer,title,value,phone,email'];
  for (let row = 1; row <= CSV_DRY_RUN_ROWS; row += 1) {
    rows.push(`Synthetic Customer ${vu}-${iteration}-${row},Synthetic Load ${row},0,+420700000000,load-${vu}-${iteration}-${row}@example.invalid`);
  }
  return rows.join('\n');
}

function runFlow(fixture, data, { includeWrites, includeCsv }) {
  // app_companies is keyed by id and carries no company_id column.
  const companyResponse = http.get(`${data.supabaseUrl}/rest/v1/app_companies?select=id&id=eq.${fixture.companyId}&limit=1`, {
    headers: headers(fixture, data.apiKey), tags: { kind: 'read', operation: 'dashboard' },
  });
  const companyRows = parseJsonArray(companyResponse);
  record(companyResponse, companyResponse.status === 200 && companyRows.some((row) => row.id === fixture.companyId));

  runRead(
    fixture,
    data,
    `app_leads?select=id,company_id,status&id=eq.${fixture.leadId}&company_id=eq.${fixture.companyId}&limit=1`,
    fixture.leadId,
    'lead_list',
  );

  if (includeWrites) {
    // Owner fixtures can safely cycle a synthetic lead between two valid states.
    // Employee status transitions are forward-only and cannot be reset by the
    // employee token during teardown, so employee VUs exercise read paths only.
    const nextStatus = __ITER % 2 === 0 ? 'contacted' : 'new';
    const writeResponse = http.patch(
      `${data.supabaseUrl}/rest/v1/app_leads?id=eq.${fixture.leadId}&company_id=eq.${fixture.companyId}`,
      JSON.stringify({ status: nextStatus }),
      { headers: headers(fixture, data.apiKey), tags: { kind: 'write', operation: 'status_change' } },
    );
    const changedRows = parseJsonArray(writeResponse);
    record(writeResponse, writeResponse.status === 200 && changedRows.length === 1
      && changedRows[0].id === fixture.leadId && changedRows[0].company_id === fixture.companyId
      && changedRows[0].status === nextStatus);
  }

  if (includeCsv) {
    const csv = csvFor(__VU, __ITER);
    const importResponse = http.post(`${data.previewUrl}/api/import-leads`, JSON.stringify({
      mode: 'dry_run',
      companyId: fixture.companyId,
      fileName: `synthetic-load-${__VU}-${__ITER}.csv`,
      csv,
      mapping: { customer: 'customerName', title: 'title', value: 'price', phone: 'customerPhone', email: 'customerEmail' },
    }), {
      headers: { Authorization: `Bearer ${fixture.accessToken}`, 'Content-Type': 'application/json' },
      tags: { kind: 'read', operation: 'csv_dry_run' },
    });
    let body = {};
    try { body = importResponse.json(); } catch { /* contract check below records the safe failure */ }
    record(importResponse, importResponse.status === 200 && body.rows === CSV_DRY_RUN_ROWS && body.companyId === fixture.companyId);
  }
}

export function ownerFlow(data) {
  const fixture = data.owners[(__VU - 1) % data.owners.length];
  runFlow(fixture, data, { includeWrites: true, includeCsv: true });
  sleep(1);
}

export function employeeFlow(data) {
  const fixture = data.employees[(__VU - 1) % data.employees.length];
  runFlow(fixture, data, { includeWrites: false, includeCsv: false });
  sleep(1);
}

export function teardown(data) {
  for (const fixture of data.owners) {
    const response = http.patch(
      `${data.supabaseUrl}/rest/v1/app_leads?id=eq.${fixture.leadId}&company_id=eq.${fixture.companyId}`,
      JSON.stringify({ status: fixture.restoreStatus }),
      { headers: headers(fixture, data.apiKey), tags: { kind: 'write', operation: 'restore_fixture' } },
    );
    if (response.status !== 200) throw new Error('Failed to restore one synthetic lead fixture after load.');
  }
}
