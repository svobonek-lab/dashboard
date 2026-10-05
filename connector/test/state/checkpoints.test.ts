import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { CheckpointStore } from '../../src/state/checkpoints.js';
import { FileOutbox } from '../../src/state/outbox.js';

test('does not advance an acknowledged cursor merely because the next page is queued', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stavbaflow-checkpoint-'));
  const checkpoints = new CheckpointStore(join(root, 'checkpoints.json'));
  await checkpoints.commit('customers', { updatedAt: '2026-10-04T08:00:00.000Z', primaryKey: '1' });
  const outbox = new FileOutbox(root);
  await outbox.enqueue({
    version: 1,
    connectorId: 'connector-1',
    companyId: 'company-1',
    mappingVersion: 1,
    requestId: 'page-2',
    dryRun: false,
    records: [],
  });

  const afterCrash = new CheckpointStore(join(root, 'checkpoints.json'));
  assert.deepEqual(await afterCrash.load('customers'), { updatedAt: '2026-10-04T08:00:00.000Z', primaryKey: '1' });
  assert.equal((await new FileOutbox(root).pending())[0]?.requestId, 'page-2');
});

test('keeps independent source checkpoints', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stavbaflow-checkpoint-'));
  const store = new CheckpointStore(join(root, 'checkpoints.json'));
  await store.commit('customers', { primaryKey: '4' });
  await store.commit('invoices', { primaryKey: '8' });
  assert.deepEqual(await store.load('customers'), { primaryKey: '4' });
  assert.deepEqual(await store.load('invoices'), { primaryKey: '8' });
});
