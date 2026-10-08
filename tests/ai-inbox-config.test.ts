import assert from 'node:assert/strict';
import test from 'node:test';
import { createIncomingLeadConfigHandler } from '../api/incoming-lead-config';

function responseRecorder() {
  return { code: 0, body: null as any, status(code: number) { this.code = code; return this; }, json(body: unknown) { this.body = body; return this; } };
}

test('owner receives a signed company-bound AI inbox URL', async () => {
  const handler = createIncomingLeadConfigHandler({
    authorizeOwner: async (token, companyId) => token === 'owner-session' && companyId.startsWith('1111'),
    sign: () => 'a'.repeat(64),
    appOrigin: 'https://dashboard.example.test',
  });
  const res = responseRecorder();
  await handler({ method: 'GET', query: { org_id: '11111111-1111-4111-8111-111111111111' }, headers: { authorization: 'Bearer owner-session' } }, res);
  assert.equal(res.code, 200);
  assert.equal(res.body.webhookUrl, `https://dashboard.example.test/api/incoming-lead?org_id=11111111-1111-4111-8111-111111111111&token=${'a'.repeat(64)}`);
  assert.equal(JSON.stringify(res.body).includes('owner-session'), false);
});

test('non-owner cannot obtain another company webhook URL', async () => {
  const handler = createIncomingLeadConfigHandler({ authorizeOwner: async () => false, sign: () => 'a'.repeat(64), appOrigin: 'https://dashboard.example.test' });
  const res = responseRecorder();
  await handler({ method: 'GET', query: { companyId: '11111111-1111-4111-8111-111111111111' }, headers: { authorization: 'Bearer employee-session' } }, res);
  assert.equal(res.code, 403);
});
