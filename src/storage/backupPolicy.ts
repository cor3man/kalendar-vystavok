// Data folder layout and backup rules (SPEC 4.2, 4.3). Pure: the time is always passed in.

export const DATA_FILE_NAME = 'kalendar-data.json';
export const BACKUP_DIR = 'backups';
/** Newest backups kept; older ones are deleted. Copies of invalid files are never pruned. */
export const BACKUPS_KEPT = 30;
/** At most one backup per this many milliseconds of editing. */
export const BACKUP_INTERVAL_MS = 10 * 60 * 1000;

/** `normal`: copy of a valid file; `invalid`: copy of a file that failed validation. */
export type BackupKind = 'normal' | 'invalid';

export interface BackupName {
  name: string;
  kind: BackupKind;
  /** Local wall-clock time from the name, 'YYYY-MM-DD HH:mm:ss', shown to the user. */
  stamp: string;
  /** Sort key with milliseconds and counter, 'YYYY-MM-DD HH:mm:ss.SSS NNNN'; sorts chronologically. */
  order: string;
}

const NAME_RE =
  /^kalendar-data_(invalid_)?(\d{4}-\d{2}-\d{2})_(\d{2})-(\d{2})-(\d{2})-(\d{3})(?:_(\d+))?\.json$/;

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/**
 * Backup file name for a moment, e.g. `kalendar-data_2027-03-14_10-22-05-042.json` (milliseconds
 * last). Uses local time: the name is a human-readable timestamp for the user, not calendar logic.
 * `counter` ≥ 2 adds `_<counter>` for a name that is already taken.
 */
export function backupFileName(ms: number, kind: BackupKind = 'normal', counter = 1): string {
  const d = new Date(ms);
  const date = `${String(d.getFullYear())}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const time = `${pad2(d.getHours())}-${pad2(d.getMinutes())}-${pad2(d.getSeconds())}`;
  const millis = String(d.getMilliseconds()).padStart(3, '0');
  const suffix = counter > 1 ? `_${String(counter)}` : '';
  return `kalendar-data_${kind === 'invalid' ? 'invalid_' : ''}${date}_${time}-${millis}${suffix}.json`;
}

/** First backup name for the moment that is not in `existing`: an existing backup is never overwritten. */
export function uniqueBackupName(ms: number, kind: BackupKind, existing: Iterable<string>): string {
  const taken = new Set(existing);
  let counter = 1;
  while (taken.has(backupFileName(ms, kind, counter))) counter++;
  return backupFileName(ms, kind, counter);
}

/** Parses a backup file name; null for any other file in the folder. */
export function parseBackupName(name: string): BackupName | null {
  const m = NAME_RE.exec(name);
  if (m === null) return null;
  const [, invalid, date = '', hh = '', mm = '', ss = '', millis = '', counter = '1'] = m;
  const stamp = `${date} ${hh}:${mm}:${ss}`;
  return {
    name,
    kind: invalid === undefined ? 'normal' : 'invalid',
    stamp,
    order: `${stamp}.${millis} ${counter.padStart(4, '0')}`,
  };
}

/** Normal backups, newest first. */
export function sortedBackups(names: readonly string[]): BackupName[] {
  return names
    .map(parseBackupName)
    .filter((b): b is BackupName => b !== null && b.kind === 'normal')
    .sort((a, b) => (a.order < b.order ? 1 : a.order > b.order ? -1 : 0));
}

/** Names of normal backups beyond the newest `keep`. */
export function backupsToPrune(names: readonly string[], keep: number = BACKUPS_KEPT): string[] {
  return sortedBackups(names)
    .slice(keep)
    .map((b) => b.name);
}

/** True when the previous file should be copied before the next write (10-minute rule). */
export function isBackupDue(lastBackupAt: number | null, now: number): boolean {
  return lastBackupAt === null || now - lastBackupAt >= BACKUP_INTERVAL_MS;
}
