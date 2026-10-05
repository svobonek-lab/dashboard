import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import type { IngestEnvelopeV1 } from '../../../shared/connectorProtocol.js';
import { FileOutbox } from '../../src/state/outbox.js';

function envelope(requestId: string): IngestEnvelopeV1 {
  return {
    version: 1,
    connectorId: 'connector-1',
    companyId: 'company-1',
    mappingVersion: 1,
    requestId,
    dryRun: false,
    records: [],
  };
}

test('persists pending events across reconstruction and acknowledges idempotently', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stavbaflow-outbox-'));
  const first = new FileOutbox(root);
  await first.enqueue(envelope('request-2'));

  const reconstructed = new FileOutbox(root);
  assert.deepEqual((await reconstructed.pending()).map(item => item.requestId), ['request-2']);
  await reconstructed.acknowledge(['request-2', 'request-2']);
  assert.deepEqual(await reconstructed.pending(), []);
});

test('enqueue is idempotent for the same request id', async () => {
  const root = await mkdtemp(join(tmpdir(), 'stavbaflow-outbox-'));
  const outbox = new FileOutbox(root);
  await outbox.enqueue(envelope('request-1'));
  await outbox.enqueue(envelope('request-1'));
  assert.equal((await outbox.pending()).length, 1);
});
