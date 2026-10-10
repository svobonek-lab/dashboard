import assert from 'node:assert/strict';
import test from 'node:test';
import { createSupportLeadMutator } from '../src/app/supportMutationRetry';

test('a lost response retry reuses the original operation id', async () => {
  const requestIds: string[] = [];
  let attempts = 0;
  const mutate = createSupportLeadMutator(async (input) => {
    requestIds.push(input.requestId);
    attempts += 1;
    if (attempts === 1) throw new Error('response lost');
    return { id: 'lead-1' };
  }, () => `request-${attempts + 1}`);

  const input = ['session-1', 'create_lead', { title: 'Střecha', customer: 'Novák' }] as const;
  await assert.rejects(() => mutate(...input), /response lost/);
  assert.deepEqual(await mutate(...input), { id: 'lead-1' });
  assert.deepEqual(requestIds, ['request-1', 'request-1']);

  await mutate(...input);
  assert.equal(requestIds[2], 'request-3', 'a confirmed operation must not reuse its completed id');
});

test('equivalent payload key order is treated as the same retry', async () => {
  const requestIds: string[] = [];
  const mutate = createSupportLeadMutator(async (input) => {
    requestIds.push(input.requestId);
    throw new Error('offline');
  }, () => 'stable-id');

  await assert.rejects(() => mutate('session-1', 'update_lead', { assigned_to: 'member-1', status: 'new' }, 'lead-1'));
  await assert.rejects(() => mutate('session-1', 'update_lead', { status: 'new', assigned_to: 'member-1' }, 'lead-1'));
  assert.deepEqual(requestIds, ['stable-id', 'stable-id']);
});
