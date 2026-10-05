import assert from 'node:assert/strict';
import test from 'node:test';

import { ConnectorHealth, HealthServer } from '../src/health.js';

test('health exposes only the approved operational fields', async () => {
  const health = new ConnectorHealth('0.1.0');
  health.setConfigured(true);
  health.setPaused(false);
  health.recordHeartbeat(new Date('2026-10-04T10:00:00.000Z'));

  assert.deepEqual(health.snapshot(), {
    status: 'ready',
    version: '0.1.0',
    configured: true,
    paused: false,
    lastHeartbeatAt: '2026-10-04T10:00:00.000Z',
  });
  assert.doesNotMatch(JSON.stringify(health.snapshot()), /password|credential|mapping|row/i);
});

test('readiness stays false until configuration and a signed heartbeat succeed', async () => {
  const health = new ConnectorHealth('0.1.0');
  assert.equal(health.ready(), false);
  health.setConfigured(true);
  assert.equal(health.ready(), false);
  health.recordHeartbeat(new Date('2026-10-04T10:00:00.000Z'));
  assert.equal(health.ready(), true);
  health.setPaused(true);
  assert.equal(health.ready(), false);
  assert.equal(health.containerHealthy(), true);
});

test('GET /health returns a safe snapshot and rejects all other routes', async () => {
  const health = new ConnectorHealth('0.1.0');
  const server = new HealthServer(health, { host: '127.0.0.1', port: 0 });
  await server.start();
  const address = server.rawServer.address();
  assert.ok(address && typeof address === 'object');

  const response = await fetch(`http://127.0.0.1:${address.port}/health`);
  assert.equal(response.status, 503);
  assert.deepEqual(Object.keys(await response.json()).sort(), ['configured', 'lastHeartbeatAt', 'paused', 'status', 'version']);

  const missing = await fetch(`http://127.0.0.1:${address.port}/missing`);
  assert.equal(missing.status, 404);
  await server.close();
});
