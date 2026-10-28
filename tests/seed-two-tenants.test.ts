import assert from 'node:assert/strict';
import test from 'node:test';
import { assertStagingSeedTarget, buildTenantLeadFixture, seedTwoTenants } from '../scripts/seed-two-tenants';

const env = {
  STAGING_SUPABASE_URL: 'https://bbbbbbbbbbbbbbbbbbbb.supabase.co',
  STAGING_SUPABASE_PROJECT_REF: 'bbbbbbbbbbbbbbbbbbbb',
  PRODUCTION_SUPABASE_PROJECT_REF: 'aaaaaaaaaaaaaaaaaaaa',
};

test('two-tenant seed accepts only the declared non-production Supabase staging project', () => {
  assert.deepEqual(assertStagingSeedTarget(env), { url: env.STAGING_SUPABASE_URL, ref: env.STAGING_SUPABASE_PROJECT_REF });
  assert.throws(() => assertStagingSeedTarget({ ...env, STAGING_SUPABASE_URL: 'https://aaaaaaaaaaaaaaaaaaaa.supabase.co' }), /Refusing to seed/);
  assert.throws(() => assertStagingSeedTarget({ ...env, STAGING_SUPABASE_PROJECT_REF: env.PRODUCTION_SUPABASE_PROJECT_REF }), /different/);
  assert.throws(() => assertStagingSeedTarget({ ...env, STAGING_SUPABASE_URL: 'https://evil.example/https://bbbbbbbbbbbbbbbbbbbb.supabase.co' }), /Refusing to seed/);
  assert.throws(() => assertStagingSeedTarget({ ...env, STAGING_SUPABASE_URL: 'http://bbbbbbbbbbbbbbbbbbbb.supabase.co' }), /Refusing to seed/);
});

test('two-tenant seed dry-run returns before requiring credentials or creating tenant records', async () => {
  const result = await seedTwoTenants(env, false);
  assert.deepEqual(result, { applied: false, stagingProjectRef: env.STAGING_SUPABASE_PROJECT_REF, tenants: [] });
});

test('tenant seed lead fixtures are deterministic, synthetic, and assigned only within their tenant', () => {
  const leadA = buildTenantLeadFixture('A', 'company-a-id', 'employee-a-id');
  const leadB = buildTenantLeadFixture('B', 'company-b-id', 'employee-b-id');

  assert.deepEqual(leadA, {
    company_id: 'company-a-id',
    title: 'StavbaFlow E2E Isolation Lead A',
    customer: 'Synthetic Customer A',
    email: 'e2e-lead-a@stavbaflow.example.test',
    phone: '+420700000000',
    address: 'Synthetic address A',
    description: 'Synthetic staging fixture for tenant isolation and Playwright acceptance.',
    status: 'new',
    value: 0,
    source: 'manual',
    assigned_to: 'employee-a-id',
  });
  assert.equal(leadB.company_id, 'company-b-id');
  assert.equal(leadB.assigned_to, 'employee-b-id');
  assert.notEqual(leadA.email, leadB.email);
});

test('tenant seed includes synthetic note, invitation, and audit rows for non-vacuous isolation controls', async () => {
  const seed = await import('../scripts/seed-two-tenants');
  assert.equal(typeof seed.buildTenantIsolationFixtures, 'function');
  const fixtures = seed.buildTenantIsolationFixtures('B', 'company-b-id', 'owner-b-id', 'employee-b-id', 'lead-b-id', Date.parse('2026-10-28T00:00:00.000Z'));

  assert.deepEqual(fixtures.note, {
    company_id: 'company-b-id',
    lead_id: 'lead-b-id',
    author: 'employee-b-id',
    body: 'Synthetic E2E isolation note B',
  });
  assert.deepEqual(fixtures.invite, {
    company_id: 'company-b-id',
    email: 'e2e-isolation-invite-b@stavbaflow.example.test',
    name: 'Synthetic Isolation Invite B',
    role: 'employee',
    expires_at: '2026-11-27T00:00:00.000Z',
  });
  assert.deepEqual(fixtures.audit, {
    company_id: 'company-b-id',
    actor: 'owner-b-id',
    action: 'E2E_ISOLATION_FIXTURE',
    entity_id: 'lead-b-id',
  });
});
