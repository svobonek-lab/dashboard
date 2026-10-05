import type { JsonValue } from '../../../shared/connectorProtocol.js';
import { AtomicJsonStore } from './atomicStore.js';

type Checkpoints = Record<string, JsonValue>;

function isJsonValue(value: unknown): value is JsonValue {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  return typeof value === 'object' && Object.values(value as Record<string, unknown>).every(isJsonValue);
}

function isCheckpoints(value: unknown): value is Checkpoints {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
    && Object.values(value as Record<string, unknown>).every(isJsonValue);
}

export class CheckpointStore {
  private readonly store: AtomicJsonStore<Checkpoints>;

  constructor(path: string) {
    this.store = new AtomicJsonStore(path, () => ({}), isCheckpoints);
  }

  async load(source: string): Promise<JsonValue | null> {
    return (await this.store.read())[source] ?? null;
  }

  async commit(source: string, cursor: JsonValue): Promise<void> {
    if (!source.trim()) throw new Error('checkpoint source is required');
    await this.store.update(current => ({ ...current, [source]: cursor }));
  }
}
