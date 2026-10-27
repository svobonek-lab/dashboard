import assert from 'node:assert/strict';
import test from 'node:test';
import { queueStaleLeadAlerts } from '../api/outbox-scheduler';

test('scheduler asks the database to enqueue alerts for leads older than 24 hours', async () => {
  let called = '';
  const service = {
    rpc: async (name: string, args: unknown) => {
      called = name;
      assert.deepEqual(args, { p_older_than: '24 hours' });
      return { data: 3, error: null };
    },
  } as any;
  const queued = await queueStaleLeadAlerts(service);
  assert.equal(called, 'app_queue_stale_lead_alerts');
  assert.equal(queued, 3);
});

test('scheduler exposes only a safe stale-lead enqueue error code', async () => {
  const service = { rpc: async () => ({ data: null, error: { message: 'contract unavailable' } }) } as any;
  await assert.rejects(() => queueStaleLeadAlerts(service), { message: 'STALE_ALERT_QUEUE_FAILED' });
});
