import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { ConnectorMappingDefinitionV1, ConnectorSourceSchemaV1 } from '../../shared/connectorProtocol.js';
import type { ConnectorConfig } from './config.js';
import { ConnectorApi, ConnectorApiError } from './api/client.js';
import { createSourceAdapter } from './adapters/types.js';
import { processConnectorCommands } from './commands/processCommands.js';
import { processByodbOperations } from './commands/processOperations.js';
import { ConnectorHealth, HealthServer } from './health.js';
import { ConnectorRuntime, verifyStateDirectory } from './main.js';
import { compileMapping } from './mapping/compileMapping.js';
import { SyncScheduler, type RunResult } from './scheduler.js';
import { loadIdentity } from './security/identity.js';
import { AtomicJsonStore, writeJsonAtomically } from './state/atomicStore.js';
import { CheckpointStore } from './state/checkpoints.js';
import { FileOutbox } from './state/outbox.js';
import { SyncEngine } from './sync/syncEngine.js';

const VERSION = '0.1.0';

interface RegistrationState {
  connectorId: string | null;
  companyId: string | null;
}

function isRegistrationState(value: unknown): value is RegistrationState {
  if (!value || typeof value !== 'object') return false;
  const state = value as Partial<RegistrationState>;
  return (state.connectorId === null || typeof state.connectorId === 'string')
    && (state.companyId === null || typeof state.companyId === 'string')
    && Boolean(state.connectorId) === Boolean(state.companyId);
}

async function loadRegistration(config: ConnectorConfig, identity: Awaited<ReturnType<typeof loadIdentity>>): Promise<RegistrationState> {
  const store = new AtomicJsonStore<RegistrationState>(
    join(config.stateRoot, 'registration.json'),
    () => ({ connectorId: null, companyId: null }),
    isRegistrationState,
  );
  const existing = await store.read();
  if (existing.connectorId && existing.companyId) return existing;
  if (!config.enrollmentCodeFile) throw new Error('connector enrollment is required');
  const enrollmentCode = (await readFile(config.enrollmentCodeFile, 'utf8')).trim();
  if (!enrollmentCode) throw new Error('connector enrollment code is empty');
  const registration = await new ConnectorApi({ baseUrl: config.apiBaseUrl, identity }).enroll(enrollmentCode);
  if (!registration.connectorId || !registration.companyId) throw new Error('connector enrollment response is incomplete');
  await store.write(registration);
  return registration;
}

async function loadMapping(path: string): Promise<ConnectorMappingDefinitionV1 | null> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as ConnectorMappingDefinitionV1;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function bootstrapConnector(config: ConnectorConfig): Promise<void> {
  await verifyStateDirectory(config.stateRoot);
  const health = new ConnectorHealth(VERSION);
  const healthServer = new HealthServer(health);
  await healthServer.start();
  const adapter = createSourceAdapter(config.database);
  let runtime: ConnectorRuntime | null = null;
  try {
    await adapter.testConnection();
    const schema = await adapter.inspectSchema();
    const readOnly = await adapter.verifyReadOnly();
    if (!readOnly.selectAllowed || !readOnly.writesDenied) throw new Error('source database account is not read-only');

    const identity = await loadIdentity(config.identityPath);
    const registration = await loadRegistration(config, identity);
    const connectorId = registration.connectorId!;
    const companyId = registration.companyId!;
    const api = new ConnectorApi({ baseUrl: config.apiBaseUrl, connectorId, identity });
    const scheduler = new SyncScheduler(join(config.stateRoot, 'scheduler.json'), { intervalMs: config.syncIntervalSeconds * 1000 });
    const outbox = new FileOutbox(config.stateRoot);
    const checkpoints = new CheckpointStore(join(config.stateRoot, 'checkpoints.json'));
    const sourceSchema: ConnectorSourceSchemaV1 = { tables: schema.tables.map(table => ({
      schema: table.schema,
      name: table.name,
      columns: table.columns.map(column => ({ name: column.name, dataType: column.dataType, nullable: column.nullable, primaryKey: column.primaryKey, generated: column.generated === true, hasDefault: column.hasDefault === true })),
    })) };
    const createEngine = (definition: ConnectorMappingDefinitionV1) => new SyncEngine({
      adapter, api, outbox, checkpoints, statePath: join(config.stateRoot, 'sync-state.json'),
      mapping: compileMapping(definition, schema), connectorId, companyId, pageSize: 250,
    });
    const storedMapping = await loadMapping(config.mappingPath);
    let activeMapping = storedMapping;
    let engine: SyncEngine | null = storedMapping ? createEngine(storedMapping) : null;

    const currentStatus = async () => !engine
      ? 'mapping_required'
      : await engine.mappingApproved() ? 'ready' : 'dry_run_required';

    const heartbeat = async (status?: string, metrics?: { completedAt: string; processed: number; changed: number; failed: number }) => {
      const resolvedStatus = status ?? await currentStatus();
      const result = await api.heartbeat({ status: resolvedStatus, version: VERSION, sourceSchema, ...(metrics ? { metrics } : {}) });
      if (result.accepted) health.recordHeartbeat();
      return result;
    };

    const runSync = async (): Promise<RunResult> => {
      health.setPaused((await scheduler.state()).paused);
      if (!engine) {
        await heartbeat('mapping_required');
        return { status: 'partial_failure' };
      }
      if (!await engine.mappingApproved()) {
        await heartbeat('dry_run_required');
        return { status: 'partial_failure' };
      }
      try {
        await heartbeat('running');
        const result = await engine.run();
        await heartbeat(result.status, { completedAt: new Date().toISOString(), processed: result.processed + result.failed, changed: result.processed, failed: result.failed });
        return { status: result.status };
      } catch (error) {
        if (error instanceof Error && /dry run approval is required/.test(error.message)) {
          await heartbeat('dry_run_required');
          return { status: 'partial_failure' };
        }
        throw error;
      }
    };

    const pollCommands = async () => {
      await processConnectorCommands(await api.pollCommands(), {
        refreshMapping: async definition => {
          const nextEngine = createEngine(definition);
          await writeJsonAtomically(config.mappingPath, definition);
          activeMapping = definition;
          engine = nextEngine;
          const result = await engine.reportDryRun();
          await heartbeat('dry_run_required', { completedAt: new Date().toISOString(), processed: result.total, changed: result.valid, failed: result.failed });
        },
        approveMapping: async mappingVersion => {
          if (!engine) throw new Error('mapping is not installed');
          await engine.approveDryRun(mappingVersion);
          await heartbeat('ready');
        },
        syncNow: async () => { await scheduler.runManual(runSync); },
        setPaused: async paused => {
          await scheduler.setPaused(paused);
          health.setPaused(paused);
          await heartbeat(paused ? 'paused' : await currentStatus());
        },
        acknowledge: commandId => api.acknowledgeCommand(commandId),
      });
      if (config.database.writeUsername && engine && await engine.mappingApproved()) {
        try {
          const operations = await api.pollOperations();
          await processByodbOperations(operations, activeMapping, adapter, schema, api);
        } catch (error) {
          if (!(error instanceof ConnectorApiError && error.code === 'BYODB_RELEASE_GATE_CLOSED')) throw error;
        }
      }
    };

    runtime = new ConnectorRuntime({
      stateRoot: config.stateRoot,
      configured: true,
      version: VERSION,
      health,
      heartbeat,
      pollCommands,
      runSync,
      scheduler,
      adapter,
    });
    await runtime.start();
    await runtime.stopped;
  } finally {
    if (runtime) await runtime.stop();
    else await adapter.close();
    await healthServer.close();
  }
}
