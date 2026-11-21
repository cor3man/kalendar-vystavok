// In-memory Storage for unit tests, e2e tests (test flag) and demos (SPEC 6.2, 7.2).
// Same backup and conflict rules as the real adapter: both are built on createFolderStorage.
import {
  createFolderStorage,
  type Clock,
  type DataFolder,
  type FileStat,
  type FolderConnector,
} from './folderStorage.ts';
import type { ParseOptions } from './schema.ts';
import type { Storage, StorageStatus } from './Storage.ts';

interface MemoryFile {
  text: string;
  lastModified: number;
}

export interface MemoryFolder extends DataFolder {
  /** All files by path, for assertions. */
  readonly files: ReadonlyMap<string, MemoryFile>;
  /** Writes a file as another program would (external change). */
  externalWrite(path: string, text: string): void;
  /** Makes the next `count` writes fail, like a full disk or a revoked permission. */
  failWrites(count?: number): void;
}

export function createMemoryFolder(clock: Clock, name = 'Memory'): MemoryFolder {
  const files = new Map<string, MemoryFile>();
  let failures = 0;
  let lastStamp = 0;

  /** Strictly increasing, so every write is distinguishable by lastModified. */
  function stamp(): number {
    lastStamp = Math.max(clock.now(), lastStamp + 1);
    return lastStamp;
  }

  function statOf(file: MemoryFile): FileStat {
    return { lastModified: file.lastModified, size: new TextEncoder().encode(file.text).length };
  }

  return {
    name,
    files,
    stat: (path) => {
      const file = files.get(path);
      return Promise.resolve(file === undefined ? null : statOf(file));
    },
    read: (path) => Promise.resolve(files.get(path)?.text ?? null),
    write: (path, text) => {
      if (failures > 0) {
        failures--;
        return Promise.reject(new Error('Simulated write failure'));
      }
      const file = { text, lastModified: stamp() };
      files.set(path, file);
      return Promise.resolve(statOf(file));
    },
    list: (dir) => {
      const prefix = `${dir}/`;
      const entries = [...files.entries()]
        .filter(([p]) => p.startsWith(prefix) && !p.slice(prefix.length).includes('/'))
        .map(([p, f]) => ({ name: p.slice(prefix.length), size: statOf(f).size }));
      return Promise.resolve(entries);
    },
    remove: (path) => {
      files.delete(path);
      return Promise.resolve();
    },
    externalWrite: (path, text) => {
      files.set(path, { text, lastModified: stamp() });
    },
    failWrites: (count = 1) => {
      failures = count;
    },
  };
}

export interface MemoryStorage extends Storage {
  readonly folder: MemoryFolder;
  /** The next folder pick is cancelled by the user. */
  cancelNextPick(): void;
}

export interface MemoryStorageOptions {
  clock?: Clock;
  /** Initial connection state, e.g. `needs-permission` to test the resume flow. */
  status?: StorageStatus;
  folder?: MemoryFolder;
  parseOptions?: ParseOptions;
}

export const systemClock: Clock = { now: () => Date.now() };

export function createMemoryStorage(options: MemoryStorageOptions = {}): MemoryStorage {
  const clock = options.clock ?? systemClock;
  const folder = options.folder ?? createMemoryFolder(clock);
  let status: StorageStatus = options.status ?? 'none';
  let cancel = false;

  const connector: FolderConnector = {
    status: () => Promise.resolve(status),
    connect: () => {
      if (cancel) {
        cancel = false;
        return Promise.reject(new DOMException('The user aborted a request.', 'AbortError'));
      }
      status = 'ready';
      return Promise.resolve(folder);
    },
    forget: () => {
      status = 'none';
      return Promise.resolve();
    },
  };

  return {
    ...createFolderStorage(connector, clock, options.parseOptions),
    folder,
    cancelNextPick: () => {
      cancel = true;
    },
  };
}
