import { readFile } from 'node:fs/promises';
import { join } from 'node:path';

import type { EntityMappingV1 } from './mapping/types.js';
import type { ConnectorConfig } from './config.js';
import { ConnectorApi } from './api/client.js';
import { createSourceAdapter } from './adapters/types.js';
import { ConnectorHealth, HealthServer } from './health.js';
import { ConnectorRuntime, verifyStateDirectory } from './main.js';
import { compileMapping } from './mapping/compileMapping.js';
import { SyncScheduler, type RunResult } from './scheduler.js';
import { loadOrCreateIdentity } from './security/identity.js';
import { AtomicJsonStore } from './state/atomicStore.js';
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

async function loadRegistration(config: ConnectorConfig, identity: Awaited<ReturnType<typeof loadOrCreateIdentity>>): Promise<RegistrationState> {
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

    const identity = await loadOrCreateIdentity(config.identityPath);
    const registration = await loadRegistration(config, identity);
    const api = new ConnectorApi({ baseUrl: config.apiBaseUrl, connectorId: registration.connectorId!, identity });
    const mapping = compileMapping(JSON.parse(await readFile(config.mappingPath, 'utf8')) as EntityMappingV1, schema);
    const scheduler = new SyncScheduler(join(config.stateRoot, 'scheduler.json'), { intervalMs: config.syncIntervalSeconds * 1000 });
    const engine = new SyncEngine({
      adapter,
      api,
      outbox: new FileOutbox(config.stateRoot),
      checkpoints: new CheckpointStore(join(config.stateRoot, 'checkpoints.json')),
      statePath: join(config.stateRoot, 'sync-state.json'),
      mapping,
      connectorId: registration.connectorId!,
      companyId: registration.companyId!,
      pageSize: 250,
    });

    const runSync = async (): Promise<RunResult> => {
      const heartbeat = await api.heartbeat({ status: 'ready', version: VERSION });
      if (!heartbeat.accepted) return { status: 'failure', failureKind: 'authorization' };
      health.recordHeartbeat();
      health.setPaused((await scheduler.state()).paused);
      try {
        return await engine.run();
      } catch (error) {
        if (error instanceof Error && /dry run approval is required/.test(error.message)) {
          await engine.dryRun();
          return { status: 'partial_failure' };
        }
        throw error;
      }
    };

    runtime = new ConnectorRuntime({
      stateRoot: config.stateRoot,
      configured: true,
      version: VERSION,
      health,
      heartbeat: () => api.heartbeat({ status: 'ready', version: VERSION }),
      runSync,
      scheduler,
      adapter,
    });
    await runtime.start();
    await engine.dryRun();
    await runtime.stopped;
  } finally {
    if (runtime) await runtime.stop();
    else await adapter.close();
    await healthServer.close();
  }
}
