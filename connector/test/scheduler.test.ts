import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { SyncScheduler } from '../src/scheduler.js';

const failed = { status: 'failure' as const, failureKind: 'transport' as const };
const success = { status: 'success' as const };

test('pauses only after five consecutive run failures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stavbaflow-scheduler-'));
  const scheduler = new SyncScheduler(join(root, 'scheduler.json'));
  for (let index = 0; index < 4; index++) {
    assert.equal((await scheduler.recordRun(failed)).paused, false);
  }
  assert.equal((await scheduler.recordRun(failed)).paused, true);
  const recovered = await scheduler.recordRun(success);
  assert.equal(recovered.consecutiveFailures, 0);
  assert.equal(recovered.paused, false);
});

test('partial record failures do not count as run-level failures', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stavbaflow-scheduler-'));
  const scheduler = new SyncScheduler(join(root, 'scheduler.json'));
  const state = await scheduler.recordRun({ status: 'partial_failure' });
  assert.equal(state.consecutiveFailures, 0);
  assert.equal(state.paused, false);
});

test('manual sync may run while paused but cannot overlap', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stavbaflow-scheduler-'));
  const scheduler = new SyncScheduler(join(root, 'scheduler.json'));
  for (let index = 0; index < 5; index++) await scheduler.recordRun(failed);
  let release!: () => void;
  const running = scheduler.runManual(() => new Promise<void>(resolve => { release = resolve; }));
  await assert.rejects(scheduler.runManual(async () => undefined), /already running/);
  release();
  await running;
});

test('uses at least a one-minute automatic interval and bounded exponential backoff', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stavbaflow-scheduler-'));
  assert.throws(() => new SyncScheduler(join(root, 'scheduler.json'), { intervalMs: 59_999 }), /60 seconds/);
  const scheduler = new SyncScheduler(join(root, 'valid.json'), { random: () => 0.5 });
  assert.equal(scheduler.intervalMs, 60_000);
  assert.equal(scheduler.retryDelayMs(1), 1_000);
  assert.equal(scheduler.retryDelayMs(20), 300_000);
});
