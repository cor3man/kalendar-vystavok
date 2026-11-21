import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DataFile } from '../../../src/domain/types.ts';
import {
  createCalendarStore,
  hasUnsavedChanges,
  type CalendarStore,
} from '../../../src/state/store.ts';
import { DATA_FILE_NAME } from '../../../src/storage/backupPolicy.ts';
import { createMemoryStorage, type MemoryStorage } from '../../../src/storage/memoryStorage.ts';
import { parseDataFile, serializeDataFile } from '../../../src/storage/schema.ts';
import type { StorageStatus } from '../../../src/storage/Storage.ts';
import fixture from '../../fixtures/v1-minimal.json' with { type: 'json' };

const base = fixture as DataFile;
const START = new Date(2027, 2, 14, 10, 0, 0).getTime();

let storage: MemoryStorage;
let store: CalendarStore;
let seedRequests: unknown[];

interface SetupOptions {
  status?: StorageStatus;
  owner?: boolean;
  supported?: boolean;
  file?: string;
}

function setup({ status = 'none', owner = true, supported = true, file }: SetupOptions = {}) {
  const clock = { now: () => Date.now() };
  storage = createMemoryStorage({ clock, status });
  if (file !== undefined) storage.folder.externalWrite(DATA_FILE_NAME, file);
  seedRequests = [];
  store = createCalendarStore({
    storage,
    tabLock: { acquire: () => Promise.resolve(owner) },
    clock,
    appVersion: '9.9.9',
    supported,
    loadSeed: (request) => {
      seedRequests.push(request);
      return Promise.resolve(structuredClone(base));
    },
  });
  return store.getState();
}

function onDisk(): DataFile {
  const text = storage.folder.files.get(DATA_FILE_NAME)?.text ?? '';
  return JSON.parse(text) as DataFile;
}

function backupCount(): number {
  return [...storage.folder.files.keys()].filter((k) => k.startsWith('backups/')).length;
}

/** Store connected to a folder that holds `data`, as after "Открыть существующую". */
async function openWith(data: DataFile = base, options: SetupOptions = {}) {
  await setup({ ...options, file: serializeDataFile(data) }).init();
  await store.getState().openFolder();
  expect(store.getState().phase.kind).toBe('ready');
}

beforeEach(() => {
  vi.useFakeTimers({ now: START });
  vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('start', () => {
  it('shows the unsupported screen without File System Access', async () => {
    await setup({ supported: false }).init();
    expect(store.getState().phase).toEqual({ kind: 'unsupported' });
  });

  it('shows the start screen with or without a remembered folder', async () => {
    await setup().init();
    expect(store.getState().phase).toEqual({ kind: 'start', remembered: false, notice: null });
    await setup({ status: 'needs-permission' }).init();
    expect(store.getState().phase).toEqual({ kind: 'start', remembered: true, notice: null });
  });

  it('resumes the remembered folder with one click', async () => {
    await setup({ status: 'needs-permission', file: serializeDataFile(base) }).init();
    await store.getState().resume();
    expect(store.getState()).toMatchObject({ phase: { kind: 'ready' }, data: base, year: 2027 });
    expect(store.getState().format).toBe('h1');
    expect(store.getState().folderName).toBe('Memory');
  });

  it('opens the remembered folder without a click while permission is granted', async () => {
    await setup({ status: 'ready', file: serializeDataFile(base) }).init();
    expect(store.getState().phase.kind).toBe('ready');
  });

  it('tells when the remembered folder lost its data file', async () => {
    await setup({ status: 'ready' }).init();
    expect(store.getState().phase).toMatchObject({ kind: 'start', notice: 'folderHasNoData' });
    await setup({ status: 'needs-permission' }).init();
    await store.getState().resume();
    expect(store.getState().phase).toMatchObject({ kind: 'start', notice: 'folderHasNoData' });
  });

  it('forgets the remembered folder on "choose another"', async () => {
    await setup({ status: 'needs-permission' }).init();
    await store.getState().chooseOtherFolder();
    expect(store.getState().phase).toEqual({ kind: 'start', remembered: false, notice: null });
    expect(await storage.status()).toBe('none');
  });
});

describe('create and open', () => {
  it('creates a folder with the lazily loaded seed and saves it', async () => {
    await setup().init();
    await store.getState().createFolder();
    expect(seedRequests).toEqual([
      { currentYear: 2027, appVersion: '9.9.9', savedAt: new Date(START).toISOString() },
    ]);
    expect(store.getState().phase.kind).toBe('ready');
    expect(onDisk()).toEqual(base);
    expect(hasUnsavedChanges(store.getState())).toBe(false);
  });

  it('never overwrites a folder that already has data and offers to open it', async () => {
    const existing = { ...base, appVersion: 'existing' };
    await setup({ file: serializeDataFile(existing) }).init();
    await store.getState().createFolder();
    expect(store.getState().phase).toMatchObject({ kind: 'start', notice: 'folderHasData' });
    expect(seedRequests).toEqual([]);
    await store.getState().openPickedFolder();
    expect(store.getState().data?.appVersion).toBe('existing');
  });

  it('returns quietly when the picker is cancelled, and reports other errors', async () => {
    await setup().init();
    storage.cancelNextPick();
    await store.getState().createFolder();
    expect(store.getState().phase).toEqual({ kind: 'start', remembered: false, notice: null });

    storage.folder.failWrites();
    await store.getState().createFolder();
    expect(store.getState().phase).toMatchObject({ kind: 'start', notice: 'error' });
  });

  it('reports a folder without a data file on open', async () => {
    await setup().init();
    await store.getState().openFolder();
    expect(store.getState().phase).toMatchObject({ kind: 'start', notice: 'folderHasNoData' });
  });
});

describe('invalid and newer files', () => {
  it('shows the invalid file screen without a backup', async () => {
    await setup({ file: '{ broken' }).init();
    await store.getState().openFolder();
    expect(store.getState().phase).toEqual({
      kind: 'invalid',
      issues: ['(root): Not valid JSON'],
      backup: null,
    });
  });

  it('restores the newest valid backup and saves it over the invalid file', async () => {
    await openWith({ ...base, appVersion: 'good' });
    storage.folder.externalWrite(DATA_FILE_NAME, '{ broken');
    vi.setSystemTime(START + 5000);
    await store.getState().openFolder();
    const phase = store.getState().phase;
    expect(phase.kind === 'invalid' && phase.backup?.stamp).toBe('2027-03-14 10:00:00');

    await store.getState().restoreNewestBackup();
    expect(store.getState().phase.kind).toBe('ready');
    expect(hasUnsavedChanges(store.getState())).toBe(true);
    await vi.advanceTimersByTimeAsync(800);
    expect(onDisk().settings).toEqual(base.settings);
    expect(
      storage.folder.files.has('backups/kalendar-data_invalid_2027-03-14_10-00-05-000.json'),
    ).toBe(true);
  });

  it('opens a newer file version read-only and never saves it', async () => {
    const text = JSON.stringify({ ...base, schemaVersion: 7 });
    await setup({ file: text }).init();
    await store.getState().openFolder();
    expect(store.getState().readOnly).toBe('newerVersion');
    store.getState().setYear(2030);
    await vi.advanceTimersByTimeAsync(2000);
    expect(storage.folder.files.get(DATA_FILE_NAME)?.text).toBe(text);
    expect(hasUnsavedChanges(store.getState())).toBe(false);
  });
});

describe('other tab', () => {
  it('is read-only: no create, no saves, but the data can be viewed', async () => {
    await setup({ owner: false }).init();
    expect(store.getState().readOnly).toBe('otherTab');
    await store.getState().createFolder();
    expect(store.getState().phase.kind).toBe('start');

    await openWith(base, { owner: false });
    const before = storage.folder.files.get(DATA_FILE_NAME)?.text;
    store.getState().setYear(2031);
    expect(store.getState().year).toBe(2031);
    await vi.advanceTimersByTimeAsync(2000);
    expect(storage.folder.files.get(DATA_FILE_NAME)?.text).toBe(before);
    await expect(store.getState().importData(base)).rejects.toThrow();
  });
});

describe('autosave', () => {
  it('saves 800 ms after the last change, with the save time and app version', async () => {
    await openWith();
    const save = vi.spyOn(storage, 'save');
    store.getState().setYear(2028);
    vi.advanceTimersByTime(400);
    store.getState().setFormat('split');
    await vi.advanceTimersByTimeAsync(799);
    expect(save).not.toHaveBeenCalled();
    expect(hasUnsavedChanges(store.getState())).toBe(true);
    await vi.advanceTimersByTimeAsync(1);
    expect(save).toHaveBeenCalledTimes(1);
    expect(onDisk()).toMatchObject({
      settings: { lastYear: 2028, lastFormat: 'split' },
      appVersion: '9.9.9',
      savedAt: new Date(START + 1200).toISOString(),
    });
    expect(hasUnsavedChanges(store.getState())).toBe(false);
    expect(store.getState().lastSavedAt).not.toBeNull();
  });

  it('ignores a change that keeps the same value', async () => {
    await openWith();
    const save = vi.spyOn(storage, 'save');
    store.getState().setYear(2027);
    store.getState().setFormat('h1');
    store.getState().setYear(Number.NaN);
    await vi.advanceTimersByTimeAsync(2000);
    expect(save).not.toHaveBeenCalled();
  });

  it('keeps the data after a failed save and retries on the next change', async () => {
    await openWith();
    storage.folder.failWrites();
    store.getState().setYear(2028);
    await vi.advanceTimersByTimeAsync(800);
    expect(store.getState().saveError).toBe('failed');
    expect(store.getState().data?.settings.lastYear).toBe(2028);
    expect(onDisk().settings.lastYear).toBe(2027);

    store.getState().setYear(2029);
    await vi.advanceTimersByTimeAsync(800);
    expect(store.getState().saveError).toBeNull();
    expect(onDisk().settings.lastYear).toBe(2029);
  });

  it('saves at once on flush', async () => {
    await openWith();
    store.getState().setYear(2028);
    await store.getState().flushSave();
    expect(onDisk().settings.lastYear).toBe(2028);
  });

  it('saves changes made while a write is running', async () => {
    await openWith();
    store.getState().setYear(2028);
    await vi.advanceTimersByTimeAsync(800);
    store.getState().setYear(2029);
    const flushing = store.getState().flushSave();
    store.getState().setYear(2030);
    await flushing;
    await vi.advanceTimersByTimeAsync(800);
    expect(onDisk().settings.lastYear).toBe(2030);
  });
});

describe('external change', () => {
  async function conflict() {
    await openWith();
    storage.folder.externalWrite(
      DATA_FILE_NAME,
      serializeDataFile({ ...base, appVersion: 'disk' }),
    );
    store.getState().setYear(2028);
    await vi.advanceTimersByTimeAsync(800);
    expect(store.getState().saveError).toBe('conflict');
  }

  it('stops autosave until the user decides', async () => {
    await conflict();
    store.getState().setYear(2029);
    await vi.advanceTimersByTimeAsync(2000);
    expect(onDisk().appVersion).toBe('disk');
  });

  it('overwrites the disk with the data of this window', async () => {
    await conflict();
    await store.getState().resolveConflict('overwrite');
    expect(store.getState().saveError).toBeNull();
    expect(onDisk().settings.lastYear).toBe(2028);
  });

  it('reloads the data from disk', async () => {
    await conflict();
    await store.getState().resolveConflict('reload');
    expect(store.getState()).toMatchObject({ saveError: null, phase: { kind: 'ready' } });
    expect(store.getState().data?.appVersion).toBe('disk');
    expect(store.getState().year).toBe(2027);
  });

  it('ignores resolveConflict without a conflict', async () => {
    await openWith();
    const save = vi.spyOn(storage, 'save');
    await store.getState().resolveConflict('overwrite');
    expect(save).not.toHaveBeenCalled();
  });
});

describe('import, restore, export', () => {
  it('backs up the current file, then replaces the data', async () => {
    await openWith();
    vi.setSystemTime(START + 1000);
    const imported = { ...base, settings: { lastYear: 2035, lastFormat: 'year' as const } };
    const parsed = store.getState().readImportFile(serializeDataFile(imported));
    expect(parsed.kind).toBe('ok');
    await store.getState().importData(imported);
    expect(backupCount()).toBe(2);
    expect(store.getState()).toMatchObject({ year: 2035, format: 'year' });
    await vi.advanceTimersByTimeAsync(800);
    expect(onDisk().settings.lastYear).toBe(2035);
  });

  it('restores a backup from the list', async () => {
    await openWith();
    store.getState().setYear(2028);
    await store.getState().flushSave();
    const [backup] = await store.getState().listBackups();
    vi.setSystemTime(START + 1000);
    await store.getState().restoreBackup(backup?.name ?? '');
    expect(store.getState().year).toBe(2027);
    await vi.advanceTimersByTimeAsync(800);
    expect(onDisk().settings.lastYear).toBe(2027);
  });

  it('exports the current data as a valid file named by today', async () => {
    await setup().init();
    expect(store.getState().exportSnapshot()).toBeNull();
    await openWith();
    const snapshot = store.getState().exportSnapshot();
    expect(snapshot?.fileName).toBe('kalendar-data_2027-03-14.json');
    const parsed = parseDataFile(snapshot?.text ?? '');
    expect(parsed.kind === 'ok' && parsed.data.appVersion).toBe('9.9.9');
  });
});

describe('change folder', () => {
  it('saves pending changes, then returns to the start screen', async () => {
    await openWith();
    store.getState().setYear(2028);
    expect(await store.getState().changeFolder()).toBe(true);
    expect(onDisk().settings.lastYear).toBe(2028);
    expect(store.getState()).toMatchObject({ phase: { kind: 'start' }, data: null });
    expect(await storage.status()).toBe('none');
  });

  it('stays when changes cannot be saved, unless discarded', async () => {
    await openWith();
    storage.folder.failWrites(2);
    store.getState().setYear(2028);
    expect(await store.getState().changeFolder()).toBe(false);
    expect(store.getState().phase.kind).toBe('ready');
    expect(await store.getState().changeFolder({ discard: true })).toBe(true);
    expect(store.getState().phase.kind).toBe('start');
  });
});
