import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AtomicJsonStore } from '../../src/state/atomicStore.js';

test('a failed atomic write does not poison all future writes', async () => {
  const root = await mkdtemp(join(tmpdir(), 'sf-write-recovery-'));
  const path = join(root, 'state.json');
  await mkdir(path);
  const store = new AtomicJsonStore(path, () => ({ count: 0 }),
    (value): value is { count: number } => !!value && typeof value === 'object' && 'count' in value);
  await assert.rejects(store.write({ count: 1 }));
  await rm(path, { recursive: true });
  await store.write({ count: 2 });
  assert.equal((await store.read()).count, 2);
});
