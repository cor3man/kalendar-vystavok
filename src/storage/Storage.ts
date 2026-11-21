// The only way the app reaches disk (CLAUDE.md, SPEC 6.3).
import type { DataFile } from '../domain/types.ts';

export type StorageStatus = 'none' | 'needs-permission' | 'ready';

/**
 * - `create`: the user picks a folder for new data; `hasData` means it already holds a data file
 *   (never overwritten; the app offers to open it instead).
 * - `open`: the user picks a folder with existing data; `noData` means the file is missing.
 * - `resume`: asks permission for the remembered folder (one click, SPEC 4.2).
 */
export type ConnectMode = 'create' | 'open' | 'resume';
export type ConnectResult = 'ok' | 'hasData' | 'noData';

export interface LoadResult {
  data: DataFile;
  /** `newerVersion`: written by a newer app; it must not be saved over (SPEC 4.4). */
  readOnly: 'newerVersion' | null;
  /** The file's schema version when migrations ran on load, else null. */
  migratedFrom: number | null;
}

export interface BackupInfo {
  name: string;
  /** Local wall-clock time of the backup, 'YYYY-MM-DD HH:mm:ss'. */
  stamp: string;
  /** Bytes. */
  size: number;
}

export interface StorageInfo {
  folderName: string | null;
  /** Epoch ms of the data file's last write by this app or at last read; null when unknown. */
  lastSavedAt: number | null;
}

export interface Storage {
  status(): Promise<StorageStatus>;
  /** Throws an AbortError when the user closes the picker (see `isAbortError`). */
  connect(mode: ConnectMode): Promise<ConnectResult>;
  /**
   * Reads, validates and migrates the data file. Copies it to backups (one per app start); after a
   * migration also writes the migrated data. Throws `DataFileError` when missing or invalid.
   */
  load(): Promise<LoadResult>;
  /**
   * Atomic write with the backup policy (SPEC 4.3). Throws `ExternalChangeError` when the file
   * changed on disk since the last read or write, unless `force`.
   */
  save(data: DataFile, options?: { force?: boolean }): Promise<void>;
  /** Copies the current data file to backups now (before import or restore, SPEC 4.7). */
  backupNow(): Promise<void>;
  /** Normal backups, newest first. */
  listBackups(): Promise<BackupInfo[]>;
  /** The newest backup that passes validation, or null. */
  newestValidBackup(): Promise<BackupInfo | null>;
  /**
   * Reads and validates a backup. The current data file is first copied to backups (as an
   * `invalid` copy when it does not validate), and saving over it is allowed afterwards.
   */
  restoreBackup(name: string): Promise<DataFile>;
  info(): StorageInfo;
  /** Disconnects and forgets the remembered folder ("change folder"). */
  forget(): Promise<void>;
}
