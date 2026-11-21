// Data folder through the File System Access API (SPEC 4.2). Thin adapter: the rules live in
// folderStorage.ts. The folder handle is remembered in IndexedDB.
import {
  createFolderStorage,
  type Clock,
  type DataFolder,
  type FolderConnector,
} from './folderStorage.ts';
import type { Storage, StorageStatus } from './Storage.ts';

// Parts of the File System Access API missing from TypeScript's DOM library.
interface PermissionMode {
  mode: 'readwrite';
}
interface PermissionHandle {
  queryPermission(options: PermissionMode): Promise<PermissionState>;
  requestPermission(options: PermissionMode): Promise<PermissionState>;
}
interface DirectoryEntries {
  values(): AsyncIterable<FileSystemHandle>;
}
interface PickerWindow {
  showDirectoryPicker(
    options: PermissionMode & { id?: string },
  ): Promise<FileSystemDirectoryHandle>;
}

export function isFileSystemAccessSupported(win: object = window): boolean {
  return 'showDirectoryPicker' in win && typeof indexedDB !== 'undefined';
}

const DB_NAME = 'kalendar-vystavok';
const DB_STORE = 'handles';
const HANDLE_KEY = 'dataFolder';

function request<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => {
      resolve(req.result);
    };
    req.onerror = () => {
      reject(req.error ?? new Error('IndexedDB request failed'));
    };
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const open = indexedDB.open(DB_NAME, 1);
  open.onupgradeneeded = () => {
    open.result.createObjectStore(DB_STORE);
  };
  const db = await request(open);
  try {
    return await request(run(db.transaction(DB_STORE, mode).objectStore(DB_STORE)));
  } finally {
    db.close();
  }
}

const handleStore = {
  async get(): Promise<FileSystemDirectoryHandle | null> {
    const value: unknown = await withStore('readonly', (s) => s.get(HANDLE_KEY));
    return value instanceof FileSystemDirectoryHandle ? value : null;
  },
  async set(handle: FileSystemDirectoryHandle): Promise<void> {
    await withStore('readwrite', (s) => s.put(handle, HANDLE_KEY));
  },
  async clear(): Promise<void> {
    await withStore('readwrite', (s) => s.delete(HANDLE_KEY));
  },
};

function isNotFound(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'NotFoundError';
}

function splitPath(path: string): { dirs: string[]; name: string } {
  const parts = path.split('/');
  const name = parts.pop() ?? '';
  return { dirs: parts, name };
}

/** DataFolder over a directory handle. */
export function handleFolder(root: FileSystemDirectoryHandle): DataFolder {
  async function dir(dirs: string[], create: boolean): Promise<FileSystemDirectoryHandle> {
    let d = root;
    for (const part of dirs) d = await d.getDirectoryHandle(part, { create });
    return d;
  }

  async function file(path: string): Promise<File | null> {
    const { dirs, name } = splitPath(path);
    try {
      return await (await (await dir(dirs, false)).getFileHandle(name)).getFile();
    } catch (error: unknown) {
      if (isNotFound(error)) return null;
      throw error;
    }
  }

  return {
    name: root.name,
    async stat(path) {
      const f = await file(path);
      return f === null ? null : { lastModified: f.lastModified, size: f.size };
    },
    async read(path) {
      return (await file(path))?.text() ?? null;
    },
    async write(path, text) {
      const { dirs, name } = splitPath(path);
      const handle = await (await dir(dirs, true)).getFileHandle(name, { create: true });
      // createWritable writes to a swap file that replaces the original only on close (SPEC 4.3).
      const writable = await handle.createWritable();
      try {
        await writable.write(text);
        await writable.close();
      } catch (error: unknown) {
        await writable.abort().catch(() => undefined);
        throw error;
      }
      const f = await handle.getFile();
      return { lastModified: f.lastModified, size: f.size };
    },
    async list(path) {
      let d: FileSystemDirectoryHandle;
      try {
        d = await dir(path === '' ? [] : path.split('/'), false);
      } catch (error: unknown) {
        if (isNotFound(error)) return [];
        throw error;
      }
      const out: { name: string; size: number }[] = [];
      for await (const entry of (d as unknown as DirectoryEntries).values()) {
        if (entry instanceof FileSystemFileHandle) {
          out.push({ name: entry.name, size: (await entry.getFile()).size });
        }
      }
      return out;
    },
    async remove(path) {
      const { dirs, name } = splitPath(path);
      try {
        await (await dir(dirs, false)).removeEntry(name);
      } catch (error: unknown) {
        if (!isNotFound(error)) throw error;
      }
    },
  };
}

const READ_WRITE: PermissionMode = { mode: 'readwrite' };

function permissions(handle: FileSystemDirectoryHandle): PermissionHandle {
  return handle as unknown as PermissionHandle;
}

function fsConnector(win: Window): FolderConnector {
  return {
    async status(): Promise<StorageStatus> {
      const handle = await handleStore.get();
      if (handle === null) return 'none';
      const state = await permissions(handle).queryPermission(READ_WRITE);
      return state === 'granted' ? 'ready' : 'needs-permission';
    },
    async connect(mode) {
      if (mode === 'resume') {
        const handle = await handleStore.get();
        if (handle === null) throw new DOMException('No remembered folder', 'NotFoundError');
        const state = await permissions(handle).requestPermission(READ_WRITE);
        if (state !== 'granted') throw new DOMException('Permission denied', 'NotAllowedError');
        return handleFolder(handle);
      }
      const picker = win as unknown as PickerWindow;
      const handle = await picker.showDirectoryPicker({ ...READ_WRITE, id: 'kalendar-data' });
      await handleStore.set(handle);
      return handleFolder(handle);
    },
    forget: () => handleStore.clear(),
  };
}

export function createFsAccessStorage(clock: Clock, win: Window = window): Storage {
  return createFolderStorage(fsConnector(win), clock);
}
