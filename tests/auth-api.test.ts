import test from 'node:test';
import assert from 'node:assert/strict';
import inviteEmployeeHandler from '../api/invite-employee';
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
