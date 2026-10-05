import { access, mkdir, open, rm, stat } from 'node:fs/promises';
import { constants } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import type { RunResult, SchedulerState } from './scheduler.js';
import { ConnectorHealth } from './health.js';

interface RuntimeScheduler {
  startAutomatic(execute: () => Promise<RunResult>): void;
  stop(): void;
  state(): Promise<SchedulerState>;
}

interface ClosableAdapter {
  close(): Promise<void>;
}

interface SignalSource {
  on(event: 'SIGINT' | 'SIGTERM', listener: () => void): unknown;
  off?(event: 'SIGINT' | 'SIGTERM', listener: () => void): unknown;
}

export interface ConnectorRuntimeOptions {
  stateRoot: string;
  configured: boolean;
  version: string;
  health: ConnectorHealth;
  heartbeat: () => Promise<{ accepted: boolean }>;
  pollCommands?: () => Promise<void>;
  commandIntervalMs?: number;
  runSync: () => Promise<RunResult>;
  scheduler: RuntimeScheduler;
  adapter: ClosableAdapter;
  signals?: SignalSource;
}

export async function verifyStateDirectory(path: string): Promise<void> {
  const root = resolve(path);
  try {
    await mkdir(root, { recursive: true, mode: 0o700 });
    if (!(await stat(root)).isDirectory()) throw new Error('not a directory');
    await access(root, constants.R_OK | constants.W_OK);
    const probe = join(root, `.write-probe-${process.pid}-${Date.now()}`);
    const handle = await open(probe, 'wx', 0o600);
    await handle.close();
    await rm(probe, { force: true });
  } catch {
    throw new Error('state directory is not writable');
  }
}

export class ConnectorRuntime {
  private stopping: Promise<void> | null = null;
  private commandTimer: NodeJS.Timeout | null = null;
  private resolveStopped!: () => void;
  readonly stopped = new Promise<void>(resolve => { this.resolveStopped = resolve; });
  private readonly signals: SignalSource;
  private readonly signalHandler = () => { void this.stop(); };

  constructor(private readonly options: ConnectorRuntimeOptions) {
    this.signals = options.signals ?? process;
  }

  async start(): Promise<void> {
    await verifyStateDirectory(this.options.stateRoot);
    this.options.health.setConfigured(this.options.configured);
    if (!this.options.configured) throw new Error('connector enrollment is incomplete');
    const heartbeat = await this.options.heartbeat();
    if (!heartbeat.accepted) throw new Error('signed heartbeat was rejected');
    this.options.health.recordHeartbeat();
    this.options.health.setPaused((await this.options.scheduler.state()).paused);
    if (this.options.pollCommands) {
      await this.options.pollCommands();
      this.commandTimer = setInterval(() => { void this.options.pollCommands?.().catch(() => undefined); }, this.options.commandIntervalMs ?? 60_000);
      this.commandTimer.unref();
    }
    this.signals.on('SIGINT', this.signalHandler);
    this.signals.on('SIGTERM', this.signalHandler);
    this.options.scheduler.startAutomatic(this.options.runSync);
  }

  async stop(): Promise<void> {
    if (this.stopping) return this.stopping;
    this.stopping = (async () => {
      this.options.scheduler.stop();
      if (this.commandTimer) clearInterval(this.commandTimer);
      this.commandTimer = null;
      this.signals.off?.('SIGINT', this.signalHandler);
      this.signals.off?.('SIGTERM', this.signalHandler);
      await this.options.adapter.close();
      this.resolveStopped();
    })();
    return this.stopping;
  }
}

async function run(): Promise<void> {
  // Runtime composition is loaded lazily so importing this module in tests never opens a database.
  const [{ loadConnectorConfig }, { bootstrapConnector }] = await Promise.all([
    import('./config.js'),
    import('./runtimeBootstrap.js'),
  ]);
  const configPath = process.env.STAVBAFLOW_CONNECTOR_CONFIG;
  if (!configPath) throw new Error('STAVBAFLOW_CONNECTOR_CONFIG is required');
  const config = await loadConnectorConfig(configPath);
  await bootstrapConnector(config);
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : '';
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) {
  run().catch(() => {
    // Fatal errors intentionally omit details because configuration paths can reveal customer infrastructure.
    process.stderr.write('StavbaFlow connector failed to start. Check the local operator logs and configuration.\n');
    process.exitCode = 1;
  });
}
