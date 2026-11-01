import test from 'node:test';
import assert from 'node:assert/strict';
import { resolveAppIdentity, resolveOrAcceptAppIdentity, toAppOrganization } from '../src/app/appSchemaIdentity';

const company = (id: string, active = true) => ({ id, name: `Firma ${id}`, slug: id, active, color: '#0A84FF' });
const member = (company_id: string, user_id: string, email: string, role: 'owner' | 'employee' = 'employee') => ({ company_id, user_id, name: 'Pracovník', email, role, active: true } as any);

test('identity resolution requires active membership and matching active company', () => {
  const result = resolveAppIdentity([member('company-a', 'auth-1', 'worker@a.cz')], [company('company-a')], 'auth-1', 'worker@a.cz');
  assert.equal(result?.organization.id, 'company-a');
  assert.equal(result?.member.role, 'employee');
  assert.equal(resolveAppIdentity([member('company-a', 'auth-1', 'worker@a.cz')], [company('company-a', false)], 'auth-1'), null);
});

test('identity resolution rejects an unknown tenant role instead of elevating it', () => {
  const invalid = member('company-a', 'auth-1', 'worker@a.cz') as any;
  invalid.role = 'administrator';
  assert.equal(resolveAppIdentity([invalid], [company('company-a')], 'auth-1', 'worker@a.cz'), null);
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

test('invited identity is accepted once before company data is resolved', async () => {
  const calls: any[] = [];
  let accepted = false;
  const client = {
    from() {
      return {
        select() { return this; }, eq() { return this; },
        in() { return Promise.resolve({ data: accepted ? [{ id: 'company-a', name: 'Firma A', slug: 'firma-a', active: true }] : [], error: null }); },
        then(resolve: any) {
          const rows = accepted ? [{ company_id: 'company-a', user_id: 'user-a', name: 'Pracovník', email: 'worker@example.com', role: 'employee', active: true }] : [];
          return Promise.resolve({ data: rows, error: null }).then(resolve);
        },
      };
    },
    async rpc(name: string, args: any) { calls.push([name, args]); accepted = true; return { data: { role: 'employee' }, error: null }; },
  };
  const result = await resolveOrAcceptAppIdentity(client, {
    id: 'user-a', email: 'worker@example.com', user_metadata: { invite_id: '11111111-1111-4111-8111-111111111111' },
  });
  assert.equal(result?.member.role, 'employee');
  assert.deepEqual(calls, [['app_accept_invite', { p_invite_id: '11111111-1111-4111-8111-111111111111' }]]);
});

test('identity resolution does not reuse invitation for an existing member', async () => {
  const calls: any[] = [];
  const client = {
    from() {
      return {
        select() { return this; }, eq() { return this; },
        in() { return Promise.resolve({ data: [{ id: 'company-a', name: 'Firma A', slug: 'firma-a', active: true }], error: null }); },
        then(resolve: any) { return Promise.resolve({ data: [{ company_id: 'company-a', user_id: 'user-a', name: 'Owner', email: 'owner@example.com', role: 'owner', active: true }], error: null }).then(resolve); },
      };
    },
    async rpc(...args: any[]) { calls.push(args); return { data: null, error: null }; },
  };
  const result = await resolveOrAcceptAppIdentity(client, { id: 'user-a', email: 'owner@example.com', user_metadata: { invite_id: '11111111-1111-4111-8111-111111111111' } });
  assert.equal(result?.member.role, 'owner');
  assert.equal(calls.length, 0);
});

test('invite activation preserves the seat-limit code and Czech database detail', async () => {
  const detail = 'Firma dosáhla limitu 5 zaměstnanců v tarifu Starter. Zrušte nevyužitou pozvánku nebo změňte tarif.';
  const client = {
    from() {
      return {
        select() { return this; }, eq() { return this; },
        then(resolve: any) { return Promise.resolve({ data: [], error: null }).then(resolve); },
      };
    },
    async rpc() { return { data: null, error: { code: 'P0001', message: 'SEAT_LIMIT_REACHED', details: detail } }; },
  };

  await assert.rejects(
    () => resolveOrAcceptAppIdentity(client, {
      id: 'user-a', email: 'worker@example.com',
      user_metadata: { invite_id: '11111111-1111-4111-8111-111111111111' },
    }),
    (error: any) => error.code === 'SEAT_LIMIT_REACHED' && error.message === detail,
  );
});
