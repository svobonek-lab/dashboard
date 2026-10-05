import { randomBytes } from 'node:crypto';
import { open, mkdir, readFile, rename, rm } from 'node:fs/promises';
import { dirname, basename, join } from 'node:path';

async function syncDirectory(path: string): Promise<void> {
  try {
    const directory = await open(path, 'r');
    try {
      await directory.sync();
    } finally {
      await directory.close();
    }
  } catch (error) {
    if (process.platform !== 'win32') throw error;
  }
}

export async function writeJsonAtomically(path: string, value: unknown): Promise<void> {
  const directory = dirname(path);
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const temporary = join(directory, `${basename(path)}.tmp-${process.pid}-${randomBytes(8).toString('hex')}`);
  const handle = await open(temporary, 'wx', 0o600);
  try {
    await handle.writeFile(`${JSON.stringify(value)}\n`, 'utf8');
    await handle.sync();
  } finally {
    await handle.close();
  }
  try {
    await rename(temporary, path);
    await syncDirectory(directory);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
}

export class AtomicJsonStore<T> {
  private writeChain: Promise<void> = Promise.resolve();

  constructor(
    private readonly path: string,
    private readonly createDefault: () => T,
    private readonly validate: (value: unknown) => value is T,
  ) {}

  async read(): Promise<T> {
    try {
      const value = JSON.parse(await readFile(this.path, 'utf8')) as unknown;
      if (!this.validate(value)) throw new Error(`invalid state file: ${basename(this.path)}`);
      return value;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return this.createDefault();
      throw error;
    }
  }

  async write(value: T): Promise<void> {
    this.writeChain = this.writeChain.then(() => writeJsonAtomically(this.path, value));
    return this.writeChain;
  }

  async update(change: (current: T) => T): Promise<T> {
    let result!: T;
    this.writeChain = this.writeChain.then(async () => {
      result = change(await this.read());
      await writeJsonAtomically(this.path, result);
    });
    await this.writeChain;
    return result;
  }
}
