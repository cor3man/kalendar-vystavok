import { beforeEach, describe, expect, it } from 'vitest';
import type { DataFile } from '../../../src/domain/types.ts';
import { BACKUP_INTERVAL_MS, DATA_FILE_NAME } from '../../../src/storage/backupPolicy.ts';
import { DataFileError, ExternalChangeError, isAbortError } from '../../../src/storage/errors.ts';
import { createMemoryStorage, type MemoryStorage } from '../../../src/storage/memoryStorage.ts';
import { serializeDataFile } from '../../../src/storage/schema.ts';
import fixture from '../../fixtures/v1-minimal.json' with { type: 'json' };

const base = fixture as DataFile;
const START = new Date(2027, 2, 14, 10, 0, 0).getTime();

function withYear(year: number): DataFile {
  return { ...base, settings: { ...base.settings, lastYear: year } };
}

let now: number;
let storage: MemoryStorage;

function files(): string[] {
  return [...storage.folder.files.keys()].sort();
}
function backups(): string[] {
  return files().filter((f) => f.startsWith('backups/'));
}
function onDisk(): DataFile {
  const text = storage.folder.files.get(DATA_FILE_NAME)?.text;
  if (text === undefined) throw new Error('no data file');
  return JSON.parse(text) as DataFile;
}

beforeEach(() => {
  now = START;
  storage = createMemoryStorage({ clock: { now: () => now } });
});

/** A folder that already holds `data`, connected and loaded as on app start. */
async function openExisting(data: DataFile = base) {
  storage.folder.externalWrite(DATA_FILE_NAME, serializeDataFile(data));
  expect(await storage.connect('open')).toBe('ok');
  return storage.load();
}

describe('connect', () => {
  it('creates in an empty folder and writes no backup for the first save', async () => {
    expect(await storage.status()).toBe('none');
    expect(await storage.connect('create')).toBe('ok');
    expect(await storage.status()).toBe('ready');
    await storage.save(base);
    expect(files()).toEqual([DATA_FILE_NAME]);
    expect(onDisk()).toEqual(base);
    expect(storage.info()).toEqual({ folderName: 'Memory', lastSavedAt: START });
  });

  it('reports a folder that already has data on create, and a missing file on open', async () => {
    expect(await storage.connect('open')).toBe('noData');
    storage.folder.externalWrite(DATA_FILE_NAME, serializeDataFile(base));
    expect(await storage.connect('create')).toBe('hasData');
    expect(await storage.connect('resume')).toBe('ok');
  });

  it('passes on a cancelled pick as an AbortError', async () => {
    storage.cancelNextPick();
    const error: unknown = await storage.connect('create').catch((e: unknown) => e);
    expect(isAbortError(error)).toBe(true);
    expect(await storage.status()).toBe('none');
  });

  it('refuses to work without a folder', async () => {
    await expect(storage.load()).rejects.toThrow('No data folder connected');
  });

  it('forgets the folder', async () => {
    await openExisting();
    await storage.forget();
    expect(await storage.status()).toBe('none');
    expect(storage.info()).toEqual({ folderName: null, lastSavedAt: null });
  });
});

describe('load', () => {
  it('returns the data and makes one backup per start', async () => {
    expect(await openExisting()).toEqual({ data: base, readOnly: null, migratedFrom: null });
    expect(backups()).toEqual(['backups/kalendar-data_2027-03-14_10-00-00.json']);
  });

  it('throws notFound without a data file', async () => {
    await storage.connect('create');
    await expect(storage.load()).rejects.toMatchObject({ kind: 'notFound' });
  });

  it('throws invalid for a broken file and never saves over it', async () => {
    storage.folder.externalWrite(DATA_FILE_NAME, '{ broken');
    await storage.connect('open');
    const error: unknown = await storage.load().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(DataFileError);
    expect(error).toMatchObject({ kind: 'invalid', issues: ['(root): Not valid JSON'] });
    await expect(storage.save(base)).rejects.toBeInstanceOf(ExternalChangeError);
    expect(storage.folder.files.get(DATA_FILE_NAME)?.text).toBe('{ broken');
  });

  it('opens a newer schema version read-only', async () => {
    storage.folder.externalWrite(DATA_FILE_NAME, JSON.stringify({ ...base, schemaVersion: 9 }));
    await storage.connect('open');
    expect(await storage.load()).toMatchObject({ readOnly: 'newerVersion', migratedFrom: null });
  });

  it('backs up the original, then saves the migrated file', async () => {
    storage = createMemoryStorage({
      clock: { now: () => now },
      parseOptions: {
        currentVersion: 2,
        migrations: { 1: (raw) => ({ ...raw, schemaVersion: 2, appVersion: 'migrated' }) },
      },
    });
    const original = serializeDataFile(base);
    const result = await openExisting();
    expect(result.migratedFrom).toBe(1);
    const [backup] = backups();
    expect(storage.folder.files.get(backup ?? '')?.text).toBe(original);
    expect(storage.folder.files.get(DATA_FILE_NAME)?.text).not.toBe(original);
    // The migrated write is ours, so the next save is not an external change.
    await storage.save(result.data);
  });
});

describe('save', () => {
  it('backs up the previous file at most once per 10 minutes', async () => {
    await openExisting(withYear(2027));
    now += 60_000;
    await storage.save(withYear(2028));
    expect(backups()).toHaveLength(1);

    now += BACKUP_INTERVAL_MS;
    await storage.save(withYear(2029));
    expect(backups()).toHaveLength(2);
    const newest = backups().at(-1) ?? '';
    expect(
      (JSON.parse(storage.folder.files.get(newest)?.text ?? '') as DataFile).settings.lastYear,
    ).toBe(2028);
    expect(onDisk().settings.lastYear).toBe(2029);
  });

  it('keeps only the newest 30 backups', async () => {
    storage.folder.externalWrite(DATA_FILE_NAME, serializeDataFile(base));
    for (let i = 0; i < 35; i++) {
      now += 1000;
      await storage.connect('open');
      await storage.load();
    }
    expect(backups()).toHaveLength(30);
    expect(backups()[0]).toBe('backups/kalendar-data_2027-03-14_10-00-06.json');
  });

  it('stops on an external change until forced', async () => {
    await openExisting();
    storage.folder.externalWrite(DATA_FILE_NAME, serializeDataFile(withYear(2030)));
    await expect(storage.save(withYear(2028))).rejects.toBeInstanceOf(ExternalChangeError);
    expect(onDisk().settings.lastYear).toBe(2030);

    await storage.save(withYear(2028), { force: true });
    expect(onDisk().settings.lastYear).toBe(2028);
    await storage.save(withYear(2029));
    expect(onDisk().settings.lastYear).toBe(2029);
  });

  it('treats a deleted data file as an external change', async () => {
    await openExisting();
    await storage.folder.remove(DATA_FILE_NAME);
    await expect(storage.save(base)).rejects.toBeInstanceOf(ExternalChangeError);
  });

  it('keeps the old file when a write fails and succeeds on the next try', async () => {
    await openExisting(withYear(2027));
    storage.folder.failWrites();
    // Backup is not due (made on load), so the failing write is the data file itself.
    await expect(storage.save(withYear(2028))).rejects.toThrow('Simulated write failure');
    expect(onDisk().settings.lastYear).toBe(2027);
    await storage.save(withYear(2028));
    expect(onDisk().settings.lastYear).toBe(2028);
  });
});

describe('backups', () => {
  it('backs up on demand and lists newest first with sizes', async () => {
    await openExisting();
    now += 5000;
    await storage.backupNow();
    const list = await storage.listBackups();
    expect(list.map((b) => b.stamp)).toEqual(['2027-03-14 10:00:05', '2027-03-14 10:00:00']);
    expect(list[0]?.size).toBe(new TextEncoder().encode(serializeDataFile(base)).length);
  });

  it('does nothing on backupNow without a data file', async () => {
    await storage.connect('create');
    await storage.backupNow();
    expect(await storage.listBackups()).toEqual([]);
  });

  it('restores a backup after copying the current file', async () => {
    await openExisting(withYear(2027));
    now += 60_000;
    await storage.save(withYear(2028));
    const [oldest] = await storage.listBackups();
    now += 1000;
    const restored = await storage.restoreBackup(oldest?.name ?? '');
    expect(restored.settings.lastYear).toBe(2027);
    expect(backups()).toHaveLength(2);
    await storage.save(restored);
    expect(onDisk().settings.lastYear).toBe(2027);
  });

  it('finds the newest valid backup and restores it over an invalid file', async () => {
    await openExisting(withYear(2027));
    now += 1000;
    storage.folder.externalWrite('backups/kalendar-data_2027-03-14_10-00-01.json', '{ broken');
    storage.folder.externalWrite(DATA_FILE_NAME, 'not json');
    now += 1000;
    await storage.connect('open');
    await expect(storage.load()).rejects.toMatchObject({ kind: 'invalid' });

    const newest = await storage.newestValidBackup();
    expect(newest?.name).toBe('kalendar-data_2027-03-14_10-00-00.json');
    const data = await storage.restoreBackup(newest?.name ?? '');
    expect(backups()).toContain('backups/kalendar-data_invalid_2027-03-14_10-00-02.json');
    expect((await storage.listBackups()).map((b) => b.name)).not.toContain(
      'kalendar-data_invalid_2027-03-14_10-00-02.json',
    );
    await storage.save(data);
    expect(onDisk().settings.lastYear).toBe(2027);
  });

  it('returns null when no backup is valid', async () => {
    await storage.connect('create');
    storage.folder.externalWrite('backups/kalendar-data_2027-03-14_10-00-01.json', '{ broken');
    expect(await storage.newestValidBackup()).toBeNull();
  });

  it('refuses to restore a missing, invalid or newer backup', async () => {
    await storage.connect('create');
    storage.folder.externalWrite('backups/kalendar-data_2027-03-14_10-00-01.json', '{ broken');
    storage.folder.externalWrite(
      'backups/kalendar-data_2027-03-14_10-00-02.json',
      JSON.stringify({ ...base, schemaVersion: 5 }),
    );
    await expect(storage.restoreBackup('nope.json')).rejects.toMatchObject({ kind: 'notFound' });
    await expect(
      storage.restoreBackup('kalendar-data_2027-03-14_10-00-01.json'),
    ).rejects.toMatchObject({ kind: 'invalid' });
    await expect(
      storage.restoreBackup('kalendar-data_2027-03-14_10-00-02.json'),
    ).rejects.toMatchObject({ kind: 'newer' });
  });
});
