import test from 'node:test';
import assert from 'node:assert/strict';
import inviteEmployeeHandler, { mapInviteRpcError } from '../api/invite-employee';
import resetEmployeePasswordHandler from '../api/reset-employee-password';

function probe() {
  return {
    statusCode: 0,
    body: undefined as any,
    status(code: number) { this.statusCode = code; return this; },
    json(payload: any) { this.body = payload; return this; },
  };
}

test('invite endpoint is fail-closed until explicitly enabled', async () => {
  const response = probe();
  await inviteEmployeeHandler({ method: 'POST', body: {} }, response);
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, 'APP_INVITE_WORKER_DISABLED');
});

test('password recovery endpoint is fail-closed until explicitly enabled', async () => {
  const response = probe();
  await resetEmployeePasswordHandler({ method: 'POST', body: { email: 'worker@example.com' } }, response);
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.code, 'AUTH_RECOVERY_DISABLED');
});

test('invite endpoint rejects a missing absolute HTTPS redirect before database access', async () => {
  const previousEnabled = process.env.APP_INVITE_WORKER_ENABLED;
  const previousUrl = process.env.PUBLIC_APP_URL;
  process.env.APP_INVITE_WORKER_ENABLED = 'true';
  delete process.env.PUBLIC_APP_URL;
  try {
    const response = probe();
    await inviteEmployeeHandler({
      method: 'POST',
      headers: { authorization: 'Bearer synthetic-token' },
      body: { companyId: '11111111-1111-4111-8111-111111111111', email: 'worker@example.com', name: 'Worker' },
    }, response);
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.code, 'AUTH_REDIRECT_CONFIG_MISSING');
  } finally {
    if (previousEnabled === undefined) delete process.env.APP_INVITE_WORKER_ENABLED;
    else process.env.APP_INVITE_WORKER_ENABLED = previousEnabled;
    if (previousUrl === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = previousUrl;
  }
});

test('invite RPC seat-limit failure becomes a Czech HTTP 409 response', () => {
  assert.deepEqual(mapInviteRpcError({
    message: 'SEAT_LIMIT_REACHED',
    details: 'Firma dosáhla limitu 5 zaměstnanců v tarifu Starter. Zrušte nevyužitou pozvánku nebo změňte tarif.',
  }), {
    status: 409,
    body: {
      code: 'SEAT_LIMIT_REACHED',
      error: 'Firma dosáhla limitu 5 zaměstnanců v tarifu Starter. Zrušte nevyužitou pozvánku nebo změňte tarif.',
    },
  });
});

test('invite RPC maps unsupported legacy plans without mislabeling them as a seat limit', () => {
  assert.deepEqual(mapInviteRpcError({ message: 'SEAT_LIMIT_PLAN_UNSUPPORTED', details: 'Nastavte podporovaný tarif.' }), {
    status: 409,
    body: { code: 'SEAT_LIMIT_PLAN_UNSUPPORTED', error: 'Nastavte podporovaný tarif.' },
  });
});

test('password recovery rejects a non-HTTPS redirect before database access', async () => {
  const previousEnabled = process.env.APP_AUTH_RECOVERY_ENABLED;
  const previousUrl = process.env.PUBLIC_APP_URL;
  process.env.APP_AUTH_RECOVERY_ENABLED = 'true';
  process.env.PUBLIC_APP_URL = 'https://dashboard-preview.vercel.app';
  try {
    const response = probe();
    await resetEmployeePasswordHandler({ method: 'POST', body: { email: 'worker@example.com' } }, response);
    assert.equal(response.statusCode, 503);
    assert.equal(response.body.code, 'AUTH_REDIRECT_CONFIG_MISSING');
  } finally {
    if (previousEnabled === undefined) delete process.env.APP_AUTH_RECOVERY_ENABLED;
    else process.env.APP_AUTH_RECOVERY_ENABLED = previousEnabled;
    if (previousUrl === undefined) delete process.env.PUBLIC_APP_URL;
    else process.env.PUBLIC_APP_URL = previousUrl;
  }
});
