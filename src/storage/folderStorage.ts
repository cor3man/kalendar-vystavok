// Storage logic shared by every adapter: the data file, backups and the external change check
// (SPEC 4.2–4.5). Adapters only provide a `DataFolder` (file access) and a `FolderConnector`.
import type { DataFile } from '../domain/types.ts';
import {
  BACKUP_DIR,
  DATA_FILE_NAME,
  backupFileName,
  backupsToPrune,
  isBackupDue,
  sortedBackups,
  type BackupKind,
} from './backupPolicy.ts';
import { DataFileError, ExternalChangeError } from './errors.ts';
import { parseDataFile, serializeDataFile, type ParseOptions, type ParseResult } from './schema.ts';
import type {
  BackupInfo,
  ConnectMode,
  ConnectResult,
  LoadResult,
  Storage,
  StorageInfo,
  StorageStatus,
} from './Storage.ts';

export interface FileStat {
  /** Epoch ms. */
  lastModified: number;
  size: number;
}

/** Minimal file access inside the data folder. Paths are relative, e.g. `backups/x.json`. */
export interface DataFolder {
  readonly name: string;
  /** null when the file does not exist. */
  stat(path: string): Promise<FileStat | null>;
  /** null when the file does not exist. */
  read(path: string): Promise<string | null>;
  /** Atomic: the old content stays intact until the new content is complete. */
  write(path: string, text: string): Promise<FileStat>;
  /** File names directly inside `dir`, with sizes; empty when `dir` does not exist. */
  list(dir: string): Promise<{ name: string; size: number }[]>;
  remove(path: string): Promise<void>;
}

export interface FolderConnector {
  status(): Promise<StorageStatus>;
  /** Picks or re-opens a folder; throws an AbortError when the user cancels. */
  connect(mode: ConnectMode): Promise<DataFolder>;
  forget(): Promise<void>;
}

export interface Clock {
  /** Epoch ms. */
  now(): number;
}

export const systemClock: Clock = { now: () => Date.now() };

const backupPath = (name: string) => `${BACKUP_DIR}/${name}`;

/** `parseOptions` lets tests run the migration path with fake schema versions. */
export function createFolderStorage(
  connector: FolderConnector,
  clock: Clock,
  parseOptions: ParseOptions = {},
): Storage {
  const parse = (text: string) => parseDataFile(text, parseOptions);
  let folder: DataFolder | null = null;
  /** lastModified of the data file at the last read or write; null = it did not exist. */
  let knownModified: number | null = null;
  let lastBackupAt: number | null = null;
  let lastSavedAt: number | null = null;

  function requireFolder(): DataFolder {
    if (folder === null) throw new Error('No data folder connected');
    return folder;
  }

  async function writeBackup(f: DataFolder, text: string, kind: BackupKind): Promise<void> {
    const now = clock.now();
    await f.write(backupPath(backupFileName(now, kind)), text);
    if (kind === 'normal') lastBackupAt = now;
    const names = (await f.list(BACKUP_DIR)).map((e) => e.name);
    for (const old of backupsToPrune(names)) await f.remove(backupPath(old));
  }

  /** Copies the current data file to backups; no-op when it does not exist. */
  async function backupCurrent(f: DataFolder, kind: BackupKind): Promise<void> {
    const text = await f.read(DATA_FILE_NAME);
    if (text !== null) await writeBackup(f, text, kind);
  }

  async function writeData(f: DataFolder, data: DataFile): Promise<void> {
    const stat = await f.write(DATA_FILE_NAME, serializeDataFile(data));
    knownModified = stat.lastModified;
    lastSavedAt = stat.lastModified;
  }

  function toBackupInfo(name: string, stamp: string, size: number): BackupInfo {
    return { name, stamp, size };
  }

  async function listBackups(): Promise<BackupInfo[]> {
    const f = requireFolder();
    const entries = await f.list(BACKUP_DIR);
    const sizes = new Map(entries.map((e) => [e.name, e.size]));
    return sortedBackups(entries.map((e) => e.name)).map((b) =>
      toBackupInfo(b.name, b.stamp, sizes.get(b.name) ?? 0),
    );
  }

  async function readBackup(name: string): Promise<ParseResult> {
    const text = await requireFolder().read(backupPath(name));
    if (text === null) throw new DataFileError('notFound');
    return parse(text);
  }

  return {
    status: () => connector.status(),

    async connect(mode: ConnectMode): Promise<ConnectResult> {
      const f = await connector.connect(mode);
      folder = f;
      knownModified = null;
      lastBackupAt = null;
      lastSavedAt = null;
      const exists = (await f.stat(DATA_FILE_NAME)) !== null;
      if (mode === 'create' && exists) return 'hasData';
      if (mode !== 'create' && !exists) return 'noData';
      return 'ok';
    },

    async load(): Promise<LoadResult> {
      const f = requireFolder();
      const stat = await f.stat(DATA_FILE_NAME);
      const text = await f.read(DATA_FILE_NAME);
      if (stat === null || text === null) throw new DataFileError('notFound');
      const result = parse(text);
      if (result.kind === 'invalid') throw new DataFileError('invalid', result.issues);
      knownModified = stat.lastModified;
      lastSavedAt = stat.lastModified;
      // One backup on every app start (SPEC 4.3); for a migration it is the original file (4.5).
      await writeBackup(f, text, 'normal');
      if (result.kind === 'newer') {
        return { data: result.data, readOnly: 'newerVersion', migratedFrom: null };
      }
      if (result.migratedFrom !== null) await writeData(f, result.data);
      return { data: result.data, readOnly: null, migratedFrom: result.migratedFrom };
    },

    async save(data: DataFile, options = {}): Promise<void> {
      const f = requireFolder();
      const stat = await f.stat(DATA_FILE_NAME);
      const onDisk = stat?.lastModified ?? null;
      if (options.force !== true && onDisk !== knownModified) throw new ExternalChangeError();
      if (stat !== null && isBackupDue(lastBackupAt, clock.now())) {
        await backupCurrent(f, 'normal');
      }
      await writeData(f, data);
    },

    async backupNow(): Promise<void> {
      await backupCurrent(requireFolder(), 'normal');
    },

    listBackups,

    async newestValidBackup(): Promise<BackupInfo | null> {
      for (const b of await listBackups()) {
        if ((await readBackup(b.name)).kind === 'ok') return b;
      }
      return null;
    },

    async restoreBackup(name: string): Promise<DataFile> {
      const f = requireFolder();
      const result = await readBackup(name);
      if (result.kind === 'invalid') throw new DataFileError('invalid', result.issues);
      if (result.kind === 'newer') throw new DataFileError('newer');
      const text = await f.read(DATA_FILE_NAME);
      if (text !== null) {
        const current = parse(text);
        await writeBackup(f, text, current.kind === 'invalid' ? 'invalid' : 'normal');
        // The broken file is preserved in backups, so the restored data may replace it.
        if (current.kind === 'invalid') {
          knownModified = (await f.stat(DATA_FILE_NAME))?.lastModified ?? null;
        }
      }
      return result.data;
    },

    info(): StorageInfo {
      return { folderName: folder?.name ?? null, lastSavedAt };
    },

    async forget(): Promise<void> {
      await connector.forget();
      folder = null;
      knownModified = null;
      lastBackupAt = null;
      lastSavedAt = null;
    },
  };
}
