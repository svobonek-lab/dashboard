import { AtomicJsonStore } from './state/atomicStore.js';

export type RunFailureKind = 'transport' | 'authorization' | 'source_connection' | 'mapping';
export type RunResult =
  | { status: 'success' }
  | { status: 'partial_failure' }
  | { status: 'failure'; failureKind: RunFailureKind };

export interface SchedulerState {
  consecutiveFailures: number;
  paused: boolean;
  lastStatus: RunResult['status'] | null;
  lastRunAt: string | null;
}

export interface SchedulerOptions {
  intervalMs?: number;
  random?: () => number;
}

function isSchedulerState(value: unknown): value is SchedulerState {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<SchedulerState>;
  return Number.isInteger(candidate.consecutiveFailures)
    && Number(candidate.consecutiveFailures) >= 0
    && typeof candidate.paused === 'boolean'
    && (candidate.lastStatus === null || ['success', 'partial_failure', 'failure'].includes(String(candidate.lastStatus)))
    && (candidate.lastRunAt === null || typeof candidate.lastRunAt === 'string');
}

const DEFAULT_STATE: SchedulerState = {
  consecutiveFailures: 0,
  paused: false,
  lastStatus: null,
  lastRunAt: null,
};

export class SyncScheduler {
  readonly intervalMs: number;
  private readonly random: () => number;
  private readonly store: AtomicJsonStore<SchedulerState>;
  private running = false;
  private timer: NodeJS.Timeout | null = null;

  constructor(path: string, options: SchedulerOptions = {}) {
    this.intervalMs = options.intervalMs ?? 60_000;
    if (this.intervalMs < 60_000) throw new Error('automatic sync interval must be at least 60 seconds');
    this.random = options.random ?? Math.random;
    this.store = new AtomicJsonStore(path, () => ({ ...DEFAULT_STATE }), isSchedulerState);
  }

  async state(): Promise<SchedulerState> {
    return this.store.read();
  }

  async setPaused(paused: boolean): Promise<SchedulerState> {
    return this.store.update(current => ({
      ...current,
      paused,
      ...(paused ? {} : { consecutiveFailures: 0 }),
    }));
  }

  async recordRun(result: RunResult): Promise<SchedulerState> {
    return this.store.update(current => {
      const failed = result.status === 'failure';
      const consecutiveFailures = failed ? current.consecutiveFailures + 1 : 0;
      return {
        consecutiveFailures,
        paused: failed ? consecutiveFailures >= 5 : false,
        lastStatus: result.status,
        lastRunAt: new Date().toISOString(),
      };
    });
  }

  retryDelayMs(attempt: number): number {
    const exponent = Math.max(0, Math.min(20, Math.floor(attempt) - 1));
    const base = Math.min(300_000, 1_000 * (2 ** exponent));
    const jitter = 0.5 + Math.min(1, Math.max(0, this.random()));
    return Math.min(300_000, Math.round(base * jitter));
  }

  async runManual<T>(execute: () => Promise<T>): Promise<T> {
    return this.runExclusive(execute);
  }

  startAutomatic(execute: () => Promise<RunResult>): void {
    if (this.timer) return;
    this.timer = setInterval(() => {
      void this.runAutomatic(execute);
    }, this.intervalMs);
    this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async runAutomatic(execute: () => Promise<RunResult>): Promise<void> {
    if ((await this.state()).paused || this.running) return;
    try {
      const result = await this.runExclusive(execute);
      await this.recordRun(result);
    } catch {
      await this.recordRun({ status: 'failure', failureKind: 'transport' });
    }
  }

  private async runExclusive<T>(execute: () => Promise<T>): Promise<T> {
    if (this.running) throw new Error('sync is already running');
    this.running = true;
    try {
      return await execute();
    } finally {
      this.running = false;
    }
  }
}
