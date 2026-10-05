import { mkdir, readFile, readdir, rename, stat, unlink } from 'node:fs/promises';
import { join } from 'node:path';

import type { IngestEnvelopeV1 } from '../../../shared/connectorProtocol.js';
import { writeJsonAtomically } from './atomicStore.js';

const SAFE_REQUEST_ID = /^[A-Za-z0-9_-]{1,160}$/;

export class FileOutbox {
  private readonly pendingDirectory: string;
  private readonly acknowledgedDirectory: string;

  constructor(root: string) {
    this.pendingDirectory = join(root, 'outbox', 'pending');
    this.acknowledgedDirectory = join(root, 'outbox', 'acked');
  }

  private path(directory: string, requestId: string): string {
    if (!SAFE_REQUEST_ID.test(requestId)) throw new Error('requestId contains unsupported characters');
    return join(directory, `${requestId}.json`);
  }

  async enqueue(event: IngestEnvelopeV1): Promise<void> {
    await mkdir(this.pendingDirectory, { recursive: true, mode: 0o700 });
    const path = this.path(this.pendingDirectory, event.requestId);
    try {
      const existing = JSON.parse(await readFile(path, 'utf8')) as IngestEnvelopeV1;
      if (JSON.stringify(existing) !== JSON.stringify(event)) throw new Error('requestId already contains a different event');
      return;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
    await writeJsonAtomically(path, event);
  }

  async pending(): Promise<IngestEnvelopeV1[]> {
    await mkdir(this.pendingDirectory, { recursive: true, mode: 0o700 });
    const files = (await readdir(this.pendingDirectory)).filter(file => file.endsWith('.json')).sort();
    return Promise.all(files.map(async file => JSON.parse(await readFile(join(this.pendingDirectory, file), 'utf8')) as IngestEnvelopeV1));
  }

  async acknowledge(requestIds: string[]): Promise<void> {
    await mkdir(this.acknowledgedDirectory, { recursive: true, mode: 0o700 });
    for (const requestId of new Set(requestIds)) {
      const source = this.path(this.pendingDirectory, requestId);
      const destination = this.path(this.acknowledgedDirectory, requestId);
      try {
        await rename(source, destination);
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
      }
    }
  }

  async pruneAcknowledged(now = Date.now(), retentionMs = 7 * 24 * 60 * 60 * 1000): Promise<number> {
    await mkdir(this.acknowledgedDirectory, { recursive: true, mode: 0o700 });
    let removed = 0;
    for (const file of await readdir(this.acknowledgedDirectory)) {
      if (!file.endsWith('.json')) continue;
      const path = join(this.acknowledgedDirectory, file);
      if (now - (await stat(path)).mtimeMs > retentionMs) {
        await unlink(path);
        removed++;
      }
    }
    return removed;
  }
}
