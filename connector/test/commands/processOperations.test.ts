import assert from 'node:assert/strict';
import test from 'node:test';

import type { ConnectorMappingDefinitionV1 } from '../../../shared/connectorProtocol.js';
import type { MappedSourceOperation } from '../../src/adapters/mappedOperations.js';
import type { SourceAdapter, SourceSchema } from '../../src/adapters/types.js';
import { processByodbOperations } from '../../src/commands/processOperations.js';

const mapping: ConnectorMappingDefinitionV1 = { version: 1, mappingVersion: 3, entityType: 'lead', sourceSystem: 'fixture', schema: 'public', table: 'leads', externalIdColumn: 'id', fields: [{ sourceColumn: 'status', targetField: 'status', conversion: { kind: 'text' } }] };
const operation: MappedSourceOperation = { operationId: 'b6b2a8fc-2f0b-45df-9aa9-1578f58c86f0', idempotencyKey: 'c7b2a8fc-2f0b-45df-9aa9-1578f58c86f0', mappingVersion: 3, entityType: 'lead', action: 'update', externalId: 'lead-1', expectedSourceVersion: 'a'.repeat(64), payload: { status: 'active' }, actorRole: 'owner', actorEmail: 'owner@example.test' };
const schema: SourceSchema = { inspectedAt: '', tables: [] };

function adapter(apply: SourceAdapter['applyMappedOperation']): SourceAdapter {
  return { driver: 'postgres', testConnection: async () => ({ ok: true, driver: 'postgres', database: 'fixture' }), inspectSchema: async () => schema, readPage: async () => ({ rows: [], nextCursor: null }), verifyReadOnly: async () => ({ selectAllowed: true, writesDenied: true }), applyMappedOperation: apply, close: async () => {} };
}

test('applies source first and sends its canonical projection in the signed acknowledgement', async () => {
  const acknowledgements: unknown[] = [];
  const record = { version: 1 as const, type: 'lead' as const, sourceSystem: 'fixture', sourceTable: 'public.leads', externalId: 'lead-1', fingerprint: 'b'.repeat(64), payload: { status: 'active' } };
  const result = await processByodbOperations([operation], mapping, adapter(async () => ({ status: 'applied', sourceVersion: record.fingerprint, record })), schema, {
    acknowledgeOperation: async (...args) => { acknowledgements.push(args); },
  });
  assert.deepEqual(result, { applied: 1, conflicts: 0, failed: 0, pending: 0 });
  assert.equal((acknowledgements[0] as unknown[])[0] && ((acknowledgements[0] as unknown[])[0] as { status: string }).status, 'applied');
  assert.deepEqual((acknowledgements[0] as unknown[])[1], record);
});

test('keeps transient source outages pending and never turns a lost acknowledgement into failure', async () => {
  const acknowledgements: unknown[] = [];
  const pending = await processByodbOperations([operation], mapping, adapter(async () => { throw new Error('ECONNREFUSED'); }), schema, {
    acknowledgeOperation: async value => { acknowledgements.push(value); },
  });
  assert.deepEqual(pending, { applied: 0, conflicts: 0, failed: 0, pending: 1 });
  assert.equal(acknowledgements.length, 0);

  const lostAck: unknown[] = [];
  await assert.rejects(processByodbOperations([operation], mapping, adapter(async () => ({ status: 'applied', sourceVersion: 'b'.repeat(64) })), schema, {
    acknowledgeOperation: async value => { lostAck.push(value); throw new Error('network unavailable'); },
  }), /network unavailable/);
  assert.equal(lostAck.length, 1);
  assert.equal((lostAck[0] as { status: string }).status, 'applied');
});

test('rejects stale mappings and reports source conflicts without claiming success', async () => {
  const acknowledgements: unknown[] = [];
  let calls = 0;
  const result = await processByodbOperations([operation], { ...mapping, mappingVersion: 2 }, adapter(async () => { calls++; return { status: 'conflict' }; }), schema, {
    acknowledgeOperation: async value => { acknowledgements.push(value); },
  });
  assert.equal(calls, 0);
  assert.equal((acknowledgements[0] as { errorCode: string }).errorCode, 'MAPPING_STALE');
  assert.equal(result.failed, 1);
});
