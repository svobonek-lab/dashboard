import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import type { IngestAckV1, IngestEnvelopeV1 } from '../../../shared/connectorProtocol.js';
import type { SourceAdapter, SourcePage, SourceSchema } from '../../src/adapters/types.js';
import { compileMapping } from '../../src/mapping/compileMapping.js';
import type { EntityMappingV1 } from '../../src/mapping/types.js';
import { SyncEngine } from '../../src/sync/syncEngine.js';
import { CheckpointStore } from '../../src/state/checkpoints.js';
import { FileOutbox } from '../../src/state/outbox.js';

const schema: SourceSchema = { inspectedAt: '', tables: [{ schema: 'public', name: 'customers', columns: [
  { name: 'id', dataType: 'bigint', nullable: false, primaryKey: true },
  { name: 'name', dataType: 'text', nullable: false, primaryKey: false },
  { name: 'updated_at', dataType: 'timestamp', nullable: false, primaryKey: false },
  { name: 'deleted_at', dataType: 'timestamp', nullable: true, primaryKey: false },
] }] };

const definition: EntityMappingV1 = {
  version: 1, mappingVersion: 1, entityType: 'customer', sourceSystem: 'fixture', schema: 'public', table: 'customers',
  externalIdColumn: 'id', updatedAtColumn: 'updated_at', deletedAtColumn: 'deleted_at',
  fields: [{ sourceColumn: 'name', targetField: 'name', conversion: { kind: 'text' }, required: true }],
};

class FakeAdapter implements SourceAdapter {
  readonly driver = 'postgres' as const;
  reads = 0;
  constructor(private readonly page: SourcePage) {}
  async testConnection() { return { ok: true, driver: this.driver, database: 'fixture' }; }
  async inspectSchema() { return schema; }
  async readPage() { this.reads++; return this.page; }
  async verifyReadOnly() { return { selectAllowed: true, writesDenied: true }; }
  async close() {}
}

class FakeApi {
  calls: IngestEnvelopeV1[] = [];
  failures = 0;
  async ingest(envelope: IngestEnvelopeV1): Promise<IngestAckV1> {
    this.calls.push(envelope);
    if (this.failures-- > 0) throw new Error('network unavailable');
    return { version: 1, requestId: envelope.requestId, accepted: true, results: envelope.records.map(record => ({ externalId: record.externalId, type: record.type, status: 'created' })) };
  }
}

async function fixture(rows = [{ id: 1, name: 'Firma A', updated_at: '2026-10-04T08:00:00Z', deleted_at: null }]) {
  const root = await mkdtemp(join(tmpdir(), 'stavbaflow-sync-'));
  const adapter = new FakeAdapter({ rows, nextCursor: { updatedAt: '2026-10-04T08:00:00.000Z', primaryKey: '1' } });
  const api = new FakeApi();
  const outbox = new FileOutbox(root);
  const checkpoints = new CheckpointStore(join(root, 'checkpoints.json'));
  const create = (mapping = definition) => new SyncEngine({
    adapter, api, outbox, checkpoints, statePath: join(root, 'sync.json'), mapping: compileMapping(mapping, schema),
    connectorId: 'connector-1', companyId: 'company-1', pageSize: 100,
  });
  return { root, adapter, api, outbox, checkpoints, create };
}

test('first run is dry only and import requires approval', async () => {
  const value = await fixture();
  const engine = value.create();
  const preview = await engine.dryRun();
  assert.equal(preview.valid, 1);
  assert.deepEqual(await value.outbox.pending(), []);
  assert.equal(await value.checkpoints.load('public.customers'), null);
  await assert.rejects(engine.run(), /dry run approval/);
});

test('reported dry run sends only valid records and value-free issue metadata without advancing state', async () => {
  const value = await fixture([
    { id: 1, name: 'Firma A', updated_at: '2026-10-04T08:00:00Z', deleted_at: null },
    { id: 2, name: '', updated_at: '2026-10-04T08:00:00Z', deleted_at: null },
  ]);
  const result = await value.create().reportDryRun();
  assert.deepEqual({ total: result.total, valid: result.valid, failed: result.failed }, { total: 2, valid: 1, failed: 1 });
  assert.equal(value.api.calls.length, 1);
  assert.equal(value.api.calls[0]?.dryRun, true);
  assert.equal(value.api.calls[0]?.records.length, 1);
  assert.deepEqual(value.api.calls[0]?.dryRunSummary, { total: 2, valid: 1, failed: 1, issues: result.issues });
  assert.equal(await value.checkpoints.load('public.customers'), null);
  assert.deepEqual(await value.outbox.pending(), []);
  assert.doesNotMatch(JSON.stringify(result.issues), /Firma A/);
});

test('approved run ingests then advances the compound cursor', async () => {
  const value = await fixture();
  const engine = value.create();
  await engine.approveDryRun(1);
  assert.equal(await engine.mappingApproved(), true);
  const result = await engine.run();
  assert.equal(result.status, 'success');
  assert.equal(value.api.calls.length, 1);
  assert.deepEqual(await value.outbox.pending(), []);
  assert.deepEqual(await value.checkpoints.load('public.customers'), { updatedAt: '2026-10-04T08:00:00.000Z', primaryKey: '1' });
});

test('network outage keeps the outbox and restart recovers without skipping the page', async () => {
  const value = await fixture();
  const first = value.create();
  await first.approveDryRun(1);
  value.api.failures = 1;
  await assert.rejects(first.run(), /network unavailable/);
  assert.equal((await value.outbox.pending()).length, 1);
  assert.equal(await value.checkpoints.load('public.customers'), null);

  const restarted = value.create();
  const result = await restarted.run();
  assert.equal(result.status, 'success');
  assert.deepEqual(await value.outbox.pending(), []);
  assert.equal(value.adapter.reads, 2);
});

test('bad rows create a partial failure while valid rows continue', async () => {
  const value = await fixture([
    { id: 1, name: 'Firma A', updated_at: '2026-10-04T08:00:00Z', deleted_at: null },
    { id: 2, name: '', updated_at: '2026-10-04T08:00:00Z', deleted_at: null },
  ]);
  const engine = value.create();
  await engine.approveDryRun(1);
  const result = await engine.run();
  assert.equal(result.status, 'partial_failure');
  assert.equal(result.failed, 1);
  assert.equal(value.api.calls[0]?.records.length, 1);
});

test('mapping version change invalidates approval and deletion maps to archive', async () => {
  const value = await fixture([{ id: 4, name: 'Firma', updated_at: '2026-10-04T10:00:00Z', deleted_at: '2026-10-04T10:00:00Z' }]);
  const first = value.create();
  await first.approveDryRun(1);
  const changed = value.create({ ...definition, mappingVersion: 2 });
  await assert.rejects(changed.run(), /dry run approval/);
  await changed.approveDryRun(2);
  await changed.run();
  assert.equal(value.api.calls.at(-1)?.records[0]?.payload.archived, true);
});
test('pending delivery recovers its durable cursor before the next source read', async () => {
  const value = await fixture();
  const first = value.create();
  await first.approveDryRun(1);
  value.api.failures = 1;
  await assert.rejects(first.run(), /network unavailable/);
  const pendingId = (await value.outbox.pending())[0]!.requestId;
  // On restart, the source is unavailable. Recovery must still finish the
  // already durable page without losing its checkpoint or changing its ID.
  value.adapter.readPage = async () => { throw new Error('source offline'); };
  await assert.rejects(value.create().run(), /source offline/);
  assert.deepEqual(await value.checkpoints.load('public.customers'),
    { updatedAt: '2026-10-04T08:00:00.000Z', primaryKey: '1' });
  assert.equal(value.api.calls.at(-1)?.requestId, pendingId);
  assert.deepEqual(await value.outbox.pending(), []);
});
test('checkpoint write failure retains acknowledged batch for idempotent replay', async () => {
  const value = await fixture();
  const engine = value.create();
  await engine.approveDryRun(1);
  const originalCommit = value.checkpoints.commit.bind(value.checkpoints);
  value.checkpoints.commit = async () => { throw new Error('disk full'); };
  await assert.rejects(engine.run(), /disk full/);
  const id = (await value.outbox.pending())[0]!.requestId;
  value.checkpoints.commit = originalCommit;
  value.adapter.readPage = async () => { throw new Error('source offline'); };
  await assert.rejects(value.create().run(), /source offline/);
  assert.equal(value.api.calls.at(-1)?.requestId, id);
  assert.deepEqual(await value.outbox.pending(), []);
  assert.notEqual(await value.checkpoints.load('public.customers'), null);
});
test('accepted=true alone cannot discard rejected, missing or foreign record acknowledgements',async()=>{
 for(const kind of ['rejected','missing','foreign']){
  const value=await fixture();const engine=value.create();await engine.approveDryRun(1);
  value.api.ingest=async envelope=>({
   version:1,requestId:envelope.requestId,accepted:true,
   results:kind==='missing'?[]:envelope.records.map(record=>({
    externalId:kind==='foreign'?'foreign':record.externalId,type:record.type,
    status:kind==='rejected'?'rejected':'created',
   })),
  });
  await assert.rejects(engine.run(),/acknowledgement/);
  assert.equal((await value.outbox.pending()).length,1);
  assert.equal(await value.checkpoints.load('public.customers'),null);
 }
});
