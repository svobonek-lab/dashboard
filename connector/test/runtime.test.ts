import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { ConnectorHealth } from '../src/health.js';
import { ConnectorRuntime, verifyStateDirectory } from '../src/main.js';

test('startup rejects a state path that is not a writable directory', async () => {
  const root = join(tmpdir(), `sf-runtime-file-${Date.now()}`);
  await writeFile(root, 'not a directory');
  await assert.rejects(verifyStateDirectory(root), /state directory/i);
});

test('runtime does not schedule before a successful signed heartbeat', async () => {
  const root = join(tmpdir(), `sf-runtime-heartbeat-${Date.now()}`);
  await mkdir(root, { recursive: true });
  let scheduled = 0;
  const health = new ConnectorHealth('0.1.0');
  const runtime = new ConnectorRuntime({
    stateRoot: root,
    configured: true,
    version: '0.1.0',
    health,
    heartbeat: async () => ({ accepted: false }),
    runSync: async () => ({ status: 'success' }),
    scheduler: {
      startAutomatic: () => { scheduled++; },
      stop: () => undefined,
      state: async () => ({ consecutiveFailures: 0, paused: false, lastStatus: null, lastRunAt: null }),
    },
    adapter: { close: async () => undefined },
  });

  await assert.rejects(runtime.start(), /heartbeat/i);
  assert.equal(scheduled, 0);
  assert.equal(health.ready(), false);
});

test('SIGTERM stops scheduling and closes the adapter exactly once', async () => {
  const root = join(tmpdir(), `sf-runtime-stop-${Date.now()}`);
  await mkdir(root, { recursive: true });
  const signals = new EventEmitter();
  let stopped = 0;
  let closed = 0;
  let scheduled = 0;
  const health = new ConnectorHealth('0.1.0');
  const runtime = new ConnectorRuntime({
    stateRoot: root,
    configured: true,
    version: '0.1.0',
    health,
    heartbeat: async () => ({ accepted: true }),
    runSync: async () => ({ status: 'success' }),
    scheduler: {
      startAutomatic: () => { scheduled++; },
      stop: () => { stopped++; },
      state: async () => ({ consecutiveFailures: 0, paused: false, lastStatus: null, lastRunAt: null }),
    },
    adapter: { close: async () => { closed++; } },
    signals,
  });

  await runtime.start();
  assert.equal(scheduled, 1);
  assert.equal(health.ready(), true);
  signals.emit('SIGTERM');
  await runtime.stopped;
  signals.emit('SIGTERM');
  assert.equal(stopped, 1);
  assert.equal(closed, 1);
});

test('runtime polls verified commands before automatic synchronization starts', async () => {
  const root = join(tmpdir(), `sf-runtime-commands-${Date.now()}`);
  await mkdir(root, { recursive: true });
  const order: string[] = [];
  const runtime = new ConnectorRuntime({
    stateRoot: root,
    configured: true,
    version: '0.1.0',
    health: new ConnectorHealth('0.1.0'),
    heartbeat: async () => ({ accepted: true }),
    pollCommands: async () => { order.push('commands'); },
    commandIntervalMs: 60_000,
    runSync: async () => ({ status: 'success' }),
    scheduler: {
      startAutomatic: () => { order.push('schedule'); },
      stop: () => undefined,
      state: async () => ({ consecutiveFailures: 0, paused: true, lastStatus: null, lastRunAt: null }),
    },
    adapter: { close: async () => undefined },
  });
  await runtime.start();
  assert.deepEqual(order, ['commands', 'schedule']);
  await runtime.stop();
});
