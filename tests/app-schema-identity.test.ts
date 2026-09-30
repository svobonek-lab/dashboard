import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAppIdentity, toAppOrganization } from '../src/app/appSchemaIdentity';

const company = (id: string, active = true) => ({ id, name: `Firma ${id}`, slug: id, active, color: '#0A84FF' });
const member = (company_id: string, user_id: string, email: string, role: 'owner' | 'employee' = 'employee') => ({ company_id, user_id, name: 'Pracovník', email, role, active: true } as any);

test('identity resolution requires active membership and matching active company', () => {
  const result = resolveAppIdentity([member('company-a', 'auth-1', 'worker@a.cz')], [company('company-a')], 'auth-1', 'worker@a.cz');
  assert.equal(result?.organization.id, 'company-a');
  assert.equal(result?.member.role, 'employee');
  assert.equal(resolveAppIdentity([member('company-a', 'auth-1', 'worker@a.cz')], [company('company-a', false)], 'auth-1'), null);
});

test('email fallback does not select a different company when auth id is absent', () => {
  const result = resolveAppIdentity([member('company-a', 'other-auth', 'worker@a.cz'), member('company-b', 'auth-2', 'worker@b.cz')], [company('company-a'), company('company-b')], 'missing', 'worker@a.cz');
  assert.equal(result?.organization.id, 'company-a');
  assert.equal(resolveAppIdentity([member('company-a', 'other-auth', 'worker@a.cz')], [company('company-b')], 'missing', 'worker@a.cz'), null);
});

test('company mapping keeps only verified production fields', () => {
  const result = toAppOrganization({ id: 'c', name: 'Firma', slug: 'firma', color: '#123456', active: true });
  assert.deepEqual({ id: result.id, name: result.name, slug: result.slug, primary_color: result.primary_color, status: result.status }, { id: 'c', name: 'Firma', slug: 'firma', primary_color: '#123456', status: 'Active' });
});
