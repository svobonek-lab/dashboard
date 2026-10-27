import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { buildCompanyExportCsv } from '../src/features/export-company-data/model/exportCsv';

test('company export contains leads, employees and verified status history without identifiers', () => {
  const employee = {
    id: 'employee-internal-9', name: 'Eva Dvořáková', email: 'eva@example.test', phone: '+420444555666',
    specialization: 'Tesařství', active: true, invitationStatus: 'Active', inviteToken: 'never-export-this',
    auth_user_id: 'auth-internal-id', organization_id: 'tenant-internal-id',
  };
  const event = {
    lead_id: 'lead-internal-42', operation: 'UPDATE', old_status: 'new', new_status: 'contacted',
    created_at: '2026-10-26T10:00:00.000Z', actor_id: 'actor-secret-id',
  };
  const csv = buildCompanyExportCsv({
    leads: [{
      id: 'lead-internal-42', title: 'Pergola', customerName: 'Jan Novák', customerEmail: 'jan@example.test',
      customerPhone: '+420111222333', description: 'Synthetic request', status: 'contacted', priority: 'normal',
      preferredDate: '2026-10-26', price: 50000, source: 'public_form', createdDate: '2026-10-25',
    }],
    employees: [employee],
    events: [event],
  });

  assert.match(csv, /Jan Novák/);
  assert.match(csv, /Eva Dvořáková/);
  assert.match(csv, /Změna stavu/);
  assert.match(csv, /new/);
  assert.match(csv, /contacted/);
  for (const privateValue of ['lead-internal-42', 'employee-internal-9', 'never-export-this', 'auth-internal-id', 'tenant-internal-id', 'actor-secret-id']) {
    assert.doesNotMatch(csv, new RegExp(privateValue));
  }
});

test('CSV neutralizes spreadsheet formulas and quotes delimiters and line breaks', () => {
  const csv = buildCompanyExportCsv({
    leads: [{ id: '1', title: '=HYPERLINK("https://bad.test")', customerName: 'Řádek; jedna\nřádek dva' }],
    employees: [],
    events: [],
  });
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/bad\.test""\)"/);
  assert.match(csv, /"Řádek; jedna\nřádek dva"/);
  assert.match(csv, /^\uFEFF"Typ";/);
});

test('export fetches through the authenticated client and constrains reads to one company', () => {
  const source = readFileSync(new URL('../src/features/export-company-data/api/exportCompanyData.ts', import.meta.url), 'utf8');
  const ui = readFileSync(new URL('../src/features/export-company-data/ui/CompanyDataExport.tsx', import.meta.url), 'utf8');
  assert.match(source, /supabase\.auth\.getUser\(\)/);
  assert.match(source, /verifyOwnerMembership\(companyId, user\.id\)/);
  assert.match(source, /\.eq\('user_id', userId\)/);
  assert.match(source, /supabase!\.from\('app_leads'\)/);
  assert.match(source, /supabase!\.from\('leads'\)/);
  assert.match(source, /\.eq\('company_id', companyId\)/);
  assert.match(source, /select\('lead_id,operation,old_status,new_status,created_at'\)/);
  assert.match(source, /role !== 'owner'/);
  assert.doesNotMatch(source, /getLeads|getEmployees|crmRepo/);
  assert.doesNotMatch(source + ui, /service_role|SUPABASE_SERVICE_ROLE_KEY|actor_id|invite_token|secret_hash/i);
});
