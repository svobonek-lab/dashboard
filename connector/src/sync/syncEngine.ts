import { randomUUID } from 'node:crypto';

import type { IngestAckV1, IngestEnvelopeV1 } from '../../../shared/connectorProtocol.js';
import type { SourceAdapter } from '../adapters/types.js';
import type { CompiledMapping, MappingIssue } from '../mapping/types.js';
import { AtomicJsonStore } from '../state/atomicStore.js';
import type { CheckpointStore } from '../state/checkpoints.js';
import type { FileOutbox } from '../state/outbox.js';

export interface IngestApi {
  ingest(envelope: IngestEnvelopeV1): Promise<IngestAckV1>;
}

interface SyncState {
  approvedMappingVersion: number | null;
  lastFullReconciliationAt: string | null;
}

export interface SyncEngineOptions {
  adapter: SourceAdapter;
  api: IngestApi;
  outbox: FileOutbox;
  checkpoints: CheckpointStore;
  statePath: string;
  mapping: CompiledMapping;
  connectorId: string;
  companyId: string;
  pageSize: number;
}

export interface DryRunResult {
  mappingVersion: number;
  total: number;
  valid: number;
  failed: number;
  issues: MappingIssue[];
}

export interface SyncRunResult {
  status: 'success' | 'partial_failure';
  processed: number;
  failed: number;
  issues: MappingIssue[];
}

function isSyncState(value: unknown): value is SyncState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<SyncState>;
  return (state.approvedMappingVersion === null || Number.isInteger(state.approvedMappingVersion))
    && (state.lastFullReconciliationAt === null || typeof state.lastFullReconciliationAt === 'string');
}


function validAcknowledgement(envelope: IngestEnvelopeV1, ack: IngestAckV1): boolean {
  if (ack?.version !== 1 || ack.accepted !== true || ack.requestId !== envelope.requestId
    || !Array.isArray(ack.results) || ack.results.length !== envelope.records.length) return false;
  const expected = new Set(envelope.records.map(record => JSON.stringify([record.type, record.externalId])));
  if (expected.size !== envelope.records.length) return false;
  for (const result of ack.results) {
    if (!result || !['created','updated','unchanged','archived'].includes(result.status)
      || !expected.delete(JSON.stringify([result.type,result.externalId]))) return false;
  }
  return expected.size === 0;
}

export class SyncEngine {
  private readonly state: AtomicJsonStore<SyncState>;
  private readonly sourceKey: string;

  constructor(private readonly options: SyncEngineOptions) {
    if (options.pageSize < 1 || options.pageSize > 1000) throw new Error('page size must be between 1 and 1000');
    this.state = new AtomicJsonStore(options.statePath, () => ({ approvedMappingVersion: null, lastFullReconciliationAt: null }), isSyncState);
    this.sourceKey = `${options.mapping.definition.schema}.${options.mapping.definition.table}`;
  }

  async dryRun(): Promise<DryRunResult> {
    const { mapped } = await this.inspectDryRunPage();
    return this.summarizeDryRun(mapped);
  }

  async reportDryRun(): Promise<DryRunResult> {
    const { mapped } = await this.inspectDryRunPage();
    const summary = this.summarizeDryRun(mapped);
    const envelope: IngestEnvelopeV1 = {
      version: 1,
      connectorId: this.options.connectorId,
      companyId: this.options.companyId,
      mappingVersion: this.options.mapping.definition.mappingVersion,
      requestId: randomUUID(),
      dryRun: true,
      dryRunSummary: { total: summary.total, valid: summary.valid, failed: summary.failed, issues: summary.issues },
      records: mapped.flatMap(result => result.record ? [result.record] : []),
    };
    const acknowledgement = await this.options.api.ingest(envelope);
    if (!validAcknowledgement(envelope, acknowledgement)) throw new Error('dry run acknowledgement was rejected');
    return summary;
  }

  private async inspectDryRunPage() {
    const page = await this.options.adapter.readPage(this.query(null));
    const mapped = page.rows.map(row => this.options.mapping.mapRow(row));
    return { page, mapped };
  }

  private summarizeDryRun(mapped: Array<ReturnType<CompiledMapping['mapRow']>>): DryRunResult {
    const issues = mapped.flatMap(result => result.issues);
    return {
      mappingVersion: this.options.mapping.definition.mappingVersion,
      total: mapped.length,
      valid: mapped.filter(result => result.record).length,
      failed: mapped.filter(result => !result.record).length,
      issues,
    };
  }

  async approveDryRun(mappingVersion: number): Promise<void> {
    if (mappingVersion !== this.options.mapping.definition.mappingVersion) throw new Error('mapping version does not match the dry run');
    await this.state.update(current => ({ ...current, approvedMappingVersion: mappingVersion }));
  }

  async mappingApproved(): Promise<boolean> {
    return (await this.state.read()).approvedMappingVersion === this.options.mapping.definition.mappingVersion;
  }

  async run(): Promise<SyncRunResult> {
    const state = await this.state.read();
    if (state.approvedMappingVersion !== this.options.mapping.definition.mappingVersion) {
      throw new Error('dry run approval is required for this mapping version');
    }
    await this.flushPending();
    const cursor = await this.options.checkpoints.load(this.sourceKey);
    const page = await this.options.adapter.readPage(this.query(cursor && typeof cursor === 'object' && !Array.isArray(cursor) ? cursor as never : null));
    const mapped = page.rows.map(row => this.options.mapping.mapRow(row));
    const issues = mapped.flatMap(result => result.issues);
    const records = mapped.flatMap(result => result.record ? [result.record] : []);

    if (records.length) {
      const envelope: IngestEnvelopeV1 = {
        version: 1,
        connectorId: this.options.connectorId,
        companyId: this.options.companyId,
        mappingVersion: this.options.mapping.definition.mappingVersion,
        requestId: randomUUID(),
        dryRun: false,
        records,
      };
      await this.options.outbox.enqueue(envelope, !issues.length && page.nextCursor
        ? { source: this.sourceKey, cursor: page.nextCursor as never } : undefined);
      await this.flushPending();
    }

    if (!issues.length && page.nextCursor) await this.options.checkpoints.commit(this.sourceKey, page.nextCursor as never);
    return { status: issues.length ? 'partial_failure' : 'success', processed: records.length, failed: mapped.length - records.length, issues };
  }

  shouldRunFullReconciliation(now: Date, dailyHourUtc: number): boolean {
    if (!Number.isInteger(dailyHourUtc) || dailyHourUtc < 0 || dailyHourUtc > 23) throw new Error('daily reconciliation hour must be 0-23');
    return now.getUTCHours() === dailyHourUtc;
  }

  private async flushPending(): Promise<void> {
    for (const envelope of await this.options.outbox.pending()) {
      const acknowledgement = await this.options.api.ingest(envelope);
      if (!validAcknowledgement(envelope, acknowledgement)) throw new Error('pending ingestion acknowledgement was rejected');
      // Persist the acknowledged cursor before removing its durable batch.
      // A crash in between replays the same idempotency key safely.
      const checkpoint = await this.options.outbox.checkpoint(envelope.requestId);
      if (checkpoint) await this.options.checkpoints.commit(checkpoint.source, checkpoint.cursor);
      await this.options.outbox.acknowledge([envelope.requestId]);
    }
  }

  private query(cursor: { updatedAt?: string; primaryKey: string } | null) {
    const mapping = this.options.mapping.definition;
    const fields = new Set(mapping.fields.map(rule => rule.sourceColumn));
    fields.add(mapping.externalIdColumn);
    if (mapping.updatedAtColumn) fields.add(mapping.updatedAtColumn);
    if (mapping.deletedAtColumn) fields.add(mapping.deletedAtColumn);
    return {
      schema: mapping.schema,
      table: mapping.table,
      primaryKey: mapping.externalIdColumn,
      updatedAtColumn: mapping.updatedAtColumn,
      columns: [...fields],
      limit: this.options.pageSize,
      cursor: cursor ?? undefined,
    };
  }
}
