import assert from 'node:assert/strict';
import test from 'node:test';

import { authorizePlatformRequest, recordPlatformAudit } from '../api/_platform/auth.js';
import { platformErrorResponse, requireGet } from '../api/_platform/http.js';
import { listPlatformCompanies } from '../api/_platform/routes/companies.js';
import { createPlatformSupportSession, getPlatformSupportSession, revokePlatformSupportSession } from '../api/_platform/routes/supportSession.js';
import platformRouter, { resolvePlatformRoute } from '../api/platform/[route].js';

function platformClients(options: { userId?: string; active?: boolean; authError?: boolean } = {}) {
  const filters: Array<[string, unknown]> = [];
  const chain: any = {
    select: () => chain,
    eq: (key: string, value: unknown) => { filters.push([key, value]); return chain; },
    maybeSingle: async () => ({
      data: options.active === false ? null : { active: true, revoked_at: null },
      error: null,
    }),
  };
  return {
    filters,
    auth: {
      auth: {
        getUser: async () => options.authError
          ? ({ data: { user: null }, error: new Error('bad token') })
          : ({ data: { user: { id: options.userId || 'admin-a' } }, error: null }),
      },
    } as any,
    service: { from: (table: string) => {
      assert.equal(table, 'app_platform_admins');
      return chain;
    } } as any,
  };
}

test('platform authorization requires a verified bearer session and active registry row', async () => {
  await assert.rejects(authorizePlatformRequest({ headers: {} }, platformClients()), /PLATFORM_AUTH_REQUIRED/);
  await assert.rejects(
    authorizePlatformRequest({ headers: { authorization: 'Basic abc' } }, platformClients()),
    /PLATFORM_AUTH_REQUIRED/,
  );
  await assert.rejects(
    authorizePlatformRequest({ headers: { authorization: 'Bearer invalid' } }, platformClients({ authError: true })),
    /PLATFORM_AUTH_INVALID/,
  );
  await assert.rejects(
    authorizePlatformRequest({ headers: { authorization: 'Bearer valid' } }, platformClients({ active: false })),
    /PLATFORM_ACCESS_DENIED/,
  );

  const clients = platformClients({ userId: 'admin-uuid' });
  const result = await authorizePlatformRequest({ headers: { authorization: 'Bearer valid' } }, clients);
  assert.equal(result.userId, 'admin-uuid');
  assert.ok(clients.filters.some(([key, value]) => key === 'user_id' && value === 'admin-uuid'));
  assert.ok(clients.filters.some(([key, value]) => key === 'active' && value === true));
});

test('platform HTTP boundary accepts GET only and maps errors without details', () => {
  assert.doesNotThrow(() => requireGet({ method: 'GET' }));
  assert.throws(() => requireGet({ method: 'POST' }), /METHOD_NOT_ALLOWED/);
  assert.deepEqual(platformErrorResponse(new Error('database secret detail')), {
    status: 500,
    body: { code: 'PLATFORM_REQUEST_FAILED' },
  });
});

test('platform operations write a minimal audit event and fail closed when auditing fails', async () => {
  let inserted: Record<string, unknown> | undefined;
  const service = {
    from: (table: string) => {
      assert.equal(table, 'app_platform_audit_events');
      return {
        insert: async (value: Record<string, unknown>) => { inserted = value; return { error: null }; },
      };
    },
  } as any;

  await recordPlatformAudit(service, {
    actorUserId: 'admin-a',
    action: 'company_directory.viewed',
    reasonCode: 'platform_api_request',
  });
  assert.deepEqual(inserted, {
    actor_user_id: 'admin-a',
    action: 'company_directory.viewed',
    outcome: 'allowed',
    reason_code: 'platform_api_request',
  });

  await assert.rejects(
    recordPlatformAudit({
      from: () => ({ insert: async () => ({ error: new Error('unavailable') }) }),
    } as any, {
      actorUserId: 'admin-a',
      action: 'platform_session.verified',
      reasonCode: 'platform_api_request',
    }),
    /PLATFORM_AUDIT_UNAVAILABLE/,
  );
});

test('company directory uses the admin-scoped RPC and returns only operational fields', async () => {
  let call: { name: string; args: unknown } | undefined;
  const service = { rpc: async (name: string, args: unknown) => {
    call = { name, args };
    return { data: [{
        id: 'company-a', name: 'Firma A', slug: 'firma-a', active: true,
        onboarding_completed: false, created_at: '2026-10-05T00:00:00Z',
        member_count: 3, subscription_status: 'not_configured',
        email: 'customer@example.invalid', address: 'private',
      }], error: null };
  } } as any;
  const result = await listPlatformCompanies(service, 'admin-a');
  assert.deepEqual(call, { name: 'app_platform_list_companies', args: { p_actor_user_id: 'admin-a' } });
  assert.deepEqual(result, [{
    id: 'company-a', name: 'Firma A', slug: 'firma-a', active: true,
    onboarding_completed: false, created_at: '2026-10-05T00:00:00Z',
    member_count: 3, subscription_status: 'not_configured', integration_status: 'not_verified',
  }]);
  assert.equal('email' in result[0], false);
});

test('support sessions are actor-bound, read-only and call service-only RPCs', async () => {
  const calls: Array<{ name: string; args: unknown }> = [];
  const service = { rpc: async (name: string, args: unknown) => {
    calls.push({ name, args });
    if (name.includes('create')) return { data: [{ id: '11111111-1111-4111-8111-111111111111', company_id: '22222222-2222-4222-8222-222222222222', access_mode: 'read_only', created_at: '2026-10-09T10:00:00Z', expires_at: '2026-10-09T10:30:00Z' }], error: null };
    if (name.includes('get')) return { data: [{ id: '11111111-1111-4111-8111-111111111111', company_id: '22222222-2222-4222-8222-222222222222', company_name: 'Firma A', member_count: 3, subscription_status: 'not_configured', access_mode: 'read_only', created_at: '2026-10-09T10:00:00Z', expires_at: '2026-10-09T10:30:00Z' }], error: null };
    return { data: true, error: null };
  } } as any;
  const companyId = '22222222-2222-4222-8222-222222222222';
  const sessionId = '11111111-1111-4111-8111-111111111111';
  const created = await createPlatformSupportSession(service, 'admin-a', companyId, 'Kontrola nastavení integrace');
  assert.equal(created.access_mode, 'read_only');
  const loaded = await getPlatformSupportSession(service, 'admin-a', sessionId);
  assert.equal(loaded.company_name, 'Firma A');
  await revokePlatformSupportSession(service, 'admin-a', sessionId);
  assert.deepEqual(calls, [
    { name: 'app_platform_create_support_session', args: { p_actor_user_id: 'admin-a', p_company_id: companyId, p_reason: 'Kontrola nastavení integrace' } },
    { name: 'app_platform_get_support_session', args: { p_actor_user_id: 'admin-a', p_session_id: sessionId } },
    { name: 'app_platform_revoke_support_session', args: { p_actor_user_id: 'admin-a', p_session_id: sessionId } },
  ]);
});

test('platform router exposes only the verified control-plane routes', async () => {
  assert.equal(typeof resolvePlatformRoute('session'), 'function');
  assert.equal(typeof resolvePlatformRoute('companies'), 'function');
  assert.equal(typeof resolvePlatformRoute('support-session'), 'function');
  assert.equal(resolvePlatformRoute('billing'), undefined);
  assert.equal(resolvePlatformRoute('__proto__'), undefined);

  let status = 0;
  let body: unknown;
  await platformRouter(
    { query: { route: 'unknown' } },
    { status: (value: number) => { status = value; return { json: (payload: unknown) => { body = payload; } }; } },
  );
  assert.equal(status, 404);
  assert.deepEqual(body, { code: 'NOT_FOUND' });
});
