import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { SyncScheduler } from '../src/scheduler.js';

const failed = { status: 'failure' as const, failureKind: 'authorization' as const };
const success = { status: 'success' as const };

test('pauses after five consecutive authorization failures', async () => {
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

test('pause and resume can be changed by a verified server command', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stavbaflow-scheduler-command-'));
  const scheduler = new SyncScheduler(join(root, 'scheduler.json'));
  assert.equal((await scheduler.setPaused(true)).paused, true);
  assert.equal((await scheduler.setPaused(false)).paused, false);
});

test('uses at least a one-minute automatic interval and bounded exponential backoff', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stavbaflow-scheduler-'));
  assert.throws(() => new SyncScheduler(join(root, 'scheduler.json'), { intervalMs: 59_999 }), /60 seconds/);
  const scheduler = new SyncScheduler(join(root, 'valid.json'), { random: () => 0.5 });
  assert.equal(scheduler.intervalMs, 60_000);
  assert.equal(scheduler.retryDelayMs(1), 1_000);
  assert.equal(scheduler.retryDelayMs(20), 300_000);
});
test('transport and source outages never permanently pause the durable worker',async()=>{
 const root=await mkdtemp(join(tmpdir(),'sf-transport-retry-'));
 const scheduler=new SyncScheduler(join(root,'scheduler.json'),{random:()=>0.5});
 for(let i=0;i<12;i++){
  const state=await scheduler.recordRun({status:'failure',failureKind:i%2?'transport':'source_connection'});
  assert.equal(state.paused,false);
 }
 const state=await scheduler.state();
 assert.equal(scheduler.automaticDelayRemaining(state,Date.parse(state.lastRunAt!)),300_000);
 assert.equal(scheduler.automaticDelayRemaining(state,Date.parse(state.lastRunAt!)+300_000),0);
 const restarted=new SyncScheduler(join(root,'scheduler.json'),{random:()=>0.5});
 assert.equal((await restarted.state()).consecutiveFailures,12);
 assert.equal((await restarted.state()).paused,false);
});
