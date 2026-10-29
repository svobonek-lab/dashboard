import test from 'node:test';
import assert from 'node:assert/strict';
import { canWriteStagingLeadStatus } from '../src/shared/api/pilotWritePolicy';
import { persistStagingLeadStatus } from '../src/shared/api/data/leadStatusRpc';

const companyId = 'a0000000-0000-4000-8000-000000000001';
const leadId = 'a1000000-0000-4000-8000-000000000001';

test('status writes require a distinct flag and exact isolated staging URL', () => {
  assert.equal(canWriteStagingLeadStatus({ VITE_STAGING_LEAD_STATUS_WRITES: 'true', VITE_SUPABASE_URL: 'https://xwzweltjvreqhjpbjrxa.supabase.co' }), true);
  assert.equal(canWriteStagingLeadStatus({ VITE_SUPABASE_URL: 'https://xwzweltjvreqhjpbjrxa.supabase.co' }), false);
  assert.equal(canWriteStagingLeadStatus({ VITE_STAGING_LEAD_STATUS_WRITES: 'true', VITE_SUPABASE_URL: 'https://oncmtmrhmjlerbwkrecv.supabase.co' }), false);
  assert.equal(canWriteStagingLeadStatus({ VITE_STAGING_LEAD_STATUS_WRITES: 'true', VITE_SUPABASE_URL: 'https://xwzweltjvreqhjpbjrxa.supabase.co.evil.test' }), false);
});

test('status RPC accepts only a single matching persisted row', async () => {
  let args: unknown;
  await persistStagingLeadStatus({ rpc: async (_name: string, value: unknown) => { args = value; return { data: [{ lead_id: leadId, status: 'won' }], error: null }; } }, companyId, leadId, 'Completed');
  assert.deepEqual(args, { p_lead_id: leadId, p_status: 'won' });
});

test('status RPC fails closed on malformed or rejected responses', async () => {
  for (const response of [
    { data: [], error: null },
    { data: [{ lead_id: 'b1000000-0000-4000-8000-000000000002', status: 'won' }], error: null },
    { data: [{ lead_id: leadId, status: 'new' }], error: null },
    { data: [{ lead_id: leadId, status: 'won' }, { lead_id: leadId, status: 'won' }], error: null },
    { data: null, error: { message: 'denied' } },
  ]) {
    await assert.rejects(() => persistStagingLeadStatus({ rpc: async () => response }, companyId, leadId, 'Completed'));
  }
  await assert.rejects(() => persistStagingLeadStatus({ rpc: async () => { throw new Error('network'); } }, companyId, leadId, 'Completed'));
  await assert.rejects(() => persistStagingLeadStatus({ rpc: async () => ({ data: null, error: null }) }, companyId, leadId, 'not-a-status'));
});
