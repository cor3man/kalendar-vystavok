// Zustand store (SPEC 6.1): the session (data folder, phases), the data, autosave state and the
// selected year and format. The UI reaches data only here; this store reaches disk only through
// the Storage interface (CLAUDE.md). Data edits go through pure functions of domain/editing.ts
// and are recorded in the undo history (SPEC 5.6).
import { createStore, type StoreApi } from 'zustand/vanilla';
import {
  deleteCountry,
  deleteEvent,
  deleteExhibition,
  deleteHoliday,
  fillBelarusHolidays,
  saveCountry,
  saveEvent,
  saveExhibition,
  saveHoliday,
  type CountryDraft,
  type EditError,
  type EditResult,
  type EventDraft,
  type ExhibitionDraft,
} from '../domain/editing.ts';
import { pushRecentColor, startView, type Preferences } from '../domain/settings.ts';
import type { DataFile, FormatId, Holiday, Id, ISODate } from '../domain/types.ts';
import { DataFileError, isAbortError } from '../storage/errors.ts';
import type { Clock } from '../storage/folderStorage.ts';
import { parseDataFile, serializeDataFile, type ParseResult } from '../storage/schema.ts';
import type { BackupInfo, Storage } from '../storage/Storage.ts';
import { createAutosave, stampForSave, type AutosaveState } from './autosave.ts';
import { todayISO } from './clock.ts';
import {
  EMPTY_HISTORY,
  record,
  redoStep,
  snapshotOf,
  undoStep,
  type History,
  type Step,
} from './history.ts';
import type { TabLock } from './tabLock.ts';

/** Years the toolbar accepts. Orthodox Easter (holidays) is defined for 1900–2099. */
export const MIN_YEAR = 2000;
export const MAX_YEAR = 2098;

export function clampYear(year: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(year)));
}

/** Message on the start screen after a connect attempt. */
export type StartNotice = 'folderHasData' | 'folderHasNoData' | 'error';

export type Phase =
  | { kind: 'checking' }
  | { kind: 'unsupported' }
  /** `remembered`: a folder handle is stored, so one click resumes (SPEC 4.2). */
  | { kind: 'start'; remembered: boolean; notice: StartNotice | null }
  | { kind: 'busy' }
  /** The data file failed validation; `backup` is the newest valid one, if any (SPEC 4.4). */
  | { kind: 'invalid'; issues: readonly string[]; backup: BackupInfo | null }
  | { kind: 'ready' };

export type ReadOnlyReason = 'otherTab' | 'newerVersion';

/** Result of an editing action: the id of the saved item, or why it was refused. */
export type EditOutcome = { ok: true; id: Id } | { ok: false; error: EditError };

export interface SaveEventInput {
  /** null: a new event. */
  id: Id | null;
  draft: EventDraft;
  /**
   * "Создать выставку «…»" (SPEC 5.4): the exhibition is created from the event's values in the
   * same undo step; `draft.exhibitionId` is ignored.
   */
  newExhibitionName?: string;
}

export interface CalendarState {
  phase: Phase;
  /** Non-null in the `ready` phase. */
  data: DataFile | null;
  year: number;
  format: FormatId;
  readOnly: ReadOnlyReason | null;
  folderName: string | null;
  lastSavedAt: number | null;
  revision: number;
  savedRevision: number;
  saving: boolean;
  saveError: 'failed' | 'conflict' | null;
  history: History;
  /** Incremented on every data edit, undo and redo (not on year / format changes). */
  editCount: number;

  init: () => Promise<void>;
  createFolder: () => Promise<void>;
  openFolder: () => Promise<void>;
  /** After `folderHasData`: open the data already in the picked folder. */
  openPickedFolder: () => Promise<void>;
  resume: () => Promise<void>;
  /** Start screen: drop the remembered folder and pick another one. */
  chooseOtherFolder: () => Promise<void>;
  setYear: (year: number) => void;
  setFormat: (format: FormatId) => void;
  /** Settings dialog (SPEC 5.10): saved, never an undo step; ignored while read-only. */
  updatePreferences: (patch: Partial<Preferences>) => void;
  /**
   * Puts a colour first in «Последние цвета» (SPEC 5.4); not an undo step. Saving an event or an
   * exhibition does this itself; the settings dialog calls it for a custom weekend tint on close.
   */
  rememberColor: (hex: string) => void;
  /** Parses a file picked for import (SPEC 4.7); nothing changes until `importData`. */
  readImportFile: (text: string) => ParseResult;
  /** Replaces the data after a backup of the current file. */
  importData: (data: DataFile) => Promise<void>;
  listBackups: () => Promise<BackupInfo[]>;
  restoreBackup: (name: string) => Promise<void>;
  /** Invalid file screen: restore the newest valid backup. */
  restoreNewestBackup: () => Promise<void>;
  resolveConflict: (choice: 'reload' | 'overwrite') => Promise<void>;
  /** Saves pending changes now (save error "retry", before leaving the page). */
  flushSave: () => Promise<void>;
  /**
   * Disconnects the folder and returns to the start screen. Returns false (and stays) when changes
   * could not be saved, unless `discard`.
   */
  changeFolder: (options?: { discard?: boolean }) => Promise<boolean>;
  /** JSON backup download of the current data (SPEC 4.3, 4.7). */
  exportSnapshot(): { fileName: string; text: string } | null;

  saveEvent: (input: SaveEventInput) => EditOutcome;
  deleteEvent: (id: Id) => EditOutcome;
  saveExhibition: (id: Id | null, draft: ExhibitionDraft) => EditOutcome;
  deleteExhibition: (id: Id) => EditOutcome;
  saveCountry: (id: Id | null, draft: CountryDraft) => EditOutcome;
  deleteCountry: (id: Id) => EditOutcome;
  /** `previousDate` null adds a holiday; otherwise the holiday at that date is changed. */
  saveHoliday: (previousDate: ISODate | null, holiday: Holiday) => EditError | null;
  deleteHoliday: (date: ISODate) => EditError | null;
  /** Adds the default Belarus holidays of a year; returns how many were added (SPEC 5.8). */
  fillHolidays: (year: number) => number;
  undo: () => void;
  redo: () => void;
}

export type CalendarStore = StoreApi<CalendarState>;

export interface SeedRequest {
  currentYear: number;
  appVersion: string;
  savedAt: string;
}

export interface StoreDeps {
  storage: Storage;
  tabLock: TabLock;
  clock: Clock;
  appVersion: string;
  /** False when the browser has no File System Access (SPEC 5.1 "Unsupported"). */
  supported: boolean;
  /** Seed data, loaded lazily so it stays out of the main bundle (SPEC §8 M3). */
  loadSeed: (request: SeedRequest) => Promise<DataFile>;
  /** Random id generator for new items (SPEC 4.1). */
  newId: () => Id;
  autosaveDelayMs?: number;
}

/** True when the state allows data edits. */
export function isWritable(s: CalendarState): boolean {
  return s.phase.kind === 'ready' && s.readOnly === null && s.data !== null;
}

export function canUndo(s: CalendarState): boolean {
  return isWritable(s) && s.history.past.length > 0;
}

export function canRedo(s: CalendarState): boolean {
  return isWritable(s) && s.history.future.length > 0;
}

export function hasUnsavedChanges(s: CalendarState): boolean {
  return s.phase.kind === 'ready' && s.readOnly === null && s.revision !== s.savedRevision;
}

export function createCalendarStore(deps: StoreDeps): CalendarStore {
  const { storage, clock, appVersion } = deps;

  const store = createStore<CalendarState>()((set, get) => {
    function startPhase(remembered: boolean, notice: StartNotice | null = null): Phase {
      return { kind: 'start', remembered, notice };
    }

    /** The calendar year of the injected clock; domain code gets it passed in (CLAUDE.md). */
    function currentYear(): number {
      return Number(todayISO(new Date(clock.now())).slice(0, 4));
    }

    function enterReady(data: DataFile, readOnly: ReadOnlyReason | null, dirty: boolean) {
      const info = storage.info();
      const view = startView(data.settings, currentYear());
      set({
        phase: { kind: 'ready' },
        data,
        year: clampYear(view.year),
        format: view.format,
        // Another tab keeps this one read-only for the whole session; a file's reason does not.
        readOnly: get().readOnly === 'otherTab' ? 'otherTab' : readOnly,
        folderName: info.folderName,
        lastSavedAt: info.lastSavedAt,
        // A dirty start (restored backup) is saved by autosave right away.
        revision: dirty ? 1 : 0,
        savedRevision: 0,
        saving: false,
        saveError: null,
        history: EMPTY_HISTORY,
      });
    }

    /** Runs a connect flow; a cancelled picker returns to the start screen silently. */
    async function connectFlow(remembered: boolean, run: () => Promise<void>) {
      set({ phase: { kind: 'busy' } });
      try {
        await run();
      } catch (error: unknown) {
        if (!isAbortError(error)) console.error(error);
        set({ phase: startPhase(remembered, isAbortError(error) ? null : 'error') });
      }
    }

    async function loadAndEnter(remembered: boolean): Promise<void> {
      try {
        const result = await storage.load();
        enterReady(result.data, result.readOnly, false);
      } catch (error: unknown) {
        if (!(error instanceof DataFileError)) throw error;
        if (error.kind === 'invalid') {
          const backup = await storage.newestValidBackup();
          set({ phase: { kind: 'invalid', issues: error.issues, backup }, data: null });
        } else {
          set({ phase: startPhase(remembered, 'folderHasNoData'), data: null });
        }
      }
    }

    function updateSettings(patch: Partial<DataFile['settings']>) {
      const { data, revision } = get();
      if (data === null) return;
      set({ data: { ...data, settings: { ...data.settings, ...patch } }, revision: revision + 1 });
    }

    /** Puts a colour first in the recent row (SPEC 5.4); not an undo step. */
    function rememberColor(hex: string) {
      const recent = get().data?.settings.recentColors;
      if (recent === undefined) return;
      const next = pushRecentColor(recent, hex);
      if (next.join() !== recent.join()) updateSettings({ recentColors: next });
    }

    /** Import and restore replace the data in one undoable step (SPEC 5.6). */
    function replaceData(data: DataFile) {
      const s = get();
      set({
        data,
        year: clampYear(data.settings.lastYear),
        format: data.settings.lastFormat,
        revision: s.revision + 1,
        history: s.data === null ? s.history : record(s.history, snapshotOf(s.data)),
        editCount: s.editCount + 1,
      });
    }

    function requireWritable(): DataFile {
      const s = get();
      if (!isWritable(s) || s.data === null) {
        throw new Error('Data cannot be changed in this state');
      }
      return s.data;
    }

    /** Applies an edit as one undo step; an edit that changes nothing is not recorded. */
    function commit(before: DataFile, after: DataFile) {
      if (after === before) return;
      const s = get();
      set({
        data: { ...after, settings: s.data?.settings ?? after.settings },
        revision: s.revision + 1,
        history: record(s.history, snapshotOf(before)),
        editCount: s.editCount + 1,
      });
    }

    function applyStep(step: Step | null) {
      const s = get();
      if (step === null || s.data === null) return;
      set({
        data: { ...s.data, ...step.snapshot },
        history: step.history,
        revision: s.revision + 1,
        editCount: s.editCount + 1,
      });
    }

    /** A random id not used by any country, exhibition or event. */
    function uniqueId(data: DataFile): Id {
      const used = new Set<Id>([
        ...data.countries.map((c) => c.id),
        ...data.exhibitions.map((x) => x.id),
        ...data.events.map((e) => e.id),
      ]);
      let id = deps.newId();
      while (used.has(id)) id = deps.newId();
      return id;
    }

    function run(edit: (data: DataFile) => EditResult, id: Id): EditOutcome {
      const before = requireWritable();
      const result = edit(before);
      if (!result.ok) return result;
      commit(before, result.data);
      return { ok: true, id };
    }

    return {
      phase: { kind: 'checking' },
      data: null,
      year: MIN_YEAR,
      format: 'year',
      readOnly: null,
      folderName: null,
      lastSavedAt: null,
      revision: 0,
      savedRevision: 0,
      saving: false,
      saveError: null,
      history: EMPTY_HISTORY,
      editCount: 0,

      async init() {
        if (!deps.supported) {
          set({ phase: { kind: 'unsupported' } });
          return;
        }
        if (!(await deps.tabLock.acquire())) set({ readOnly: 'otherTab' });
        const status = await storage.status();
        if (status === 'ready') {
          // Permission is still granted: open the remembered folder without a click.
          await connectFlow(true, async () => {
            const result = await storage.connect('resume');
            if (result === 'noData') set({ phase: startPhase(true, 'folderHasNoData') });
            else await loadAndEnter(true);
          });
        } else {
          set({ phase: startPhase(status === 'needs-permission') });
        }
      },

      async createFolder() {
        if (get().readOnly !== null) return;
        await connectFlow(false, async () => {
          const result = await storage.connect('create');
          if (result === 'hasData') {
            set({ phase: startPhase(false, 'folderHasData') });
            return;
          }
          const now = clock.now();
          const seed = await deps.loadSeed({
            currentYear: Number(todayISO(new Date(now)).slice(0, 4)),
            appVersion,
            savedAt: new Date(now).toISOString(),
          });
          await storage.save(seed);
          enterReady(seed, null, false);
        });
      },

      async openFolder() {
        await connectFlow(false, async () => {
          const result = await storage.connect('open');
          if (result === 'noData') set({ phase: startPhase(false, 'folderHasNoData') });
          else await loadAndEnter(false);
        });
      },

      async openPickedFolder() {
        await connectFlow(false, () => loadAndEnter(false));
      },

      async resume() {
        await connectFlow(true, async () => {
          const result = await storage.connect('resume');
          if (result === 'noData') set({ phase: startPhase(true, 'folderHasNoData') });
          else await loadAndEnter(true);
        });
      },

      async chooseOtherFolder() {
        await storage.forget();
        set({ phase: startPhase(false) });
      },

      setYear(year) {
        if (!Number.isFinite(year)) return;
        const lastYear = clampYear(year);
        set({ year: lastYear });
        if (get().data?.settings.lastYear !== lastYear) updateSettings({ lastYear });
      },

      setFormat(format) {
        set({ format });
        if (get().data?.settings.lastFormat !== format) updateSettings({ lastFormat: format });
      },

      updatePreferences(patch) {
        const s = get();
        if (!isWritable(s) || s.data === null) return;
        const current = s.data.settings;
        const changed = (Object.keys(patch) as (keyof Preferences)[]).some(
          (key) => patch[key] !== undefined && patch[key] !== current[key],
        );
        if (changed) updateSettings(patch);
      },

      rememberColor(hex) {
        if (isWritable(get())) rememberColor(hex);
      },

      readImportFile: (text) => parseDataFile(text),

      async importData(data) {
        requireWritable();
        await storage.backupNow();
        replaceData(data);
      },

      listBackups: () => storage.listBackups(),

      async restoreBackup(name) {
        requireWritable();
        replaceData(await storage.restoreBackup(name));
      },

      async restoreNewestBackup() {
        const { phase, readOnly } = get();
        if (phase.kind !== 'invalid' || phase.backup === null || readOnly !== null) return;
        const { name } = phase.backup;
        await connectFlow(false, async () => {
          enterReady(await storage.restoreBackup(name), null, true);
        });
      },

      async resolveConflict(choice) {
        if (get().saveError !== 'conflict') return;
        if (choice === 'overwrite') {
          await autosave.overwrite();
          return;
        }
        await connectFlow(true, () => loadAndEnter(true));
      },

      flushSave: () => autosave.flush(),

      async changeFolder(options = {}) {
        await autosave.flush();
        if (hasUnsavedChanges(get()) && options.discard !== true) return false;
        await storage.forget();
        set({
          phase: startPhase(false),
          data: null,
          folderName: null,
          lastSavedAt: null,
          revision: 0,
          savedRevision: 0,
          saveError: null,
          readOnly: get().readOnly === 'otherTab' ? 'otherTab' : null,
          history: EMPTY_HISTORY,
        });
        return true;
      },

      exportSnapshot() {
        const { data } = get();
        if (data === null) return null;
        const now = clock.now();
        return {
          fileName: `kalendar-data_${todayISO(new Date(now))}.json`,
          text: serializeDataFile(stampForSave(data, now, appVersion)),
        };
      },

      saveEvent({ id, draft, newExhibitionName }) {
        const before = requireWritable();
        let data = before;
        let eventDraft = draft;
        if (newExhibitionName !== undefined) {
          const exhibitionId = uniqueId(data);
          const created = saveExhibition(data, exhibitionId, {
            name: newExhibitionName,
            shortName: newExhibitionName,
            logo: null,
            defaultCity: draft.city,
            defaultCountryId: draft.countryId,
            defaultColor: draft.color,
          });
          if (!created.ok) return created;
          data = created.data;
          eventDraft = { ...draft, exhibitionId };
        }
        const eventId = id ?? uniqueId(data);
        const result = saveEvent(data, eventId, eventDraft);
        if (!result.ok) return result;
        commit(before, result.data);
        rememberColor(eventDraft.color);
        return { ok: true, id: eventId };
      },

      deleteEvent: (id) => run((d) => deleteEvent(d, id), id),

      saveExhibition(id, draft) {
        const itemId = id ?? uniqueId(requireWritable());
        const outcome = run((d) => saveExhibition(d, itemId, draft), itemId);
        if (outcome.ok) rememberColor(draft.defaultColor);
        return outcome;
      },

      deleteExhibition: (id) => run((d) => deleteExhibition(d, id), id),

      saveCountry(id, draft) {
        const itemId = id ?? uniqueId(requireWritable());
        return run((d) => saveCountry(d, itemId, draft), itemId);
      },

      deleteCountry: (id) => run((d) => deleteCountry(d, id), id),

      saveHoliday(previousDate, holiday) {
        const outcome = run((d) => saveHoliday(d, previousDate, holiday), holiday.date);
        return outcome.ok ? null : outcome.error;
      },

      deleteHoliday(date) {
        const outcome = run((d) => deleteHoliday(d, date), date);
        return outcome.ok ? null : outcome.error;
      },

      fillHolidays(year) {
        const before = requireWritable();
        const after = fillBelarusHolidays(before, year);
        commit(before, after);
        return after.holidays.length - before.holidays.length;
      },

      undo() {
        const s = get();
        if (!canUndo(s) || s.data === null) return;
        applyStep(undoStep(s.history, snapshotOf(s.data)));
      },

      redo() {
        const s = get();
        if (!canRedo(s) || s.data === null) return;
        applyStep(redoStep(s.history, snapshotOf(s.data)));
      },
    };
  });

  const autosave = createAutosave({
    get: (): AutosaveState => {
      const s = store.getState();
      return { ...s, canSave: s.phase.kind === 'ready' && s.readOnly === null };
    },
    set: (patch) => {
      store.setState(patch);
    },
    storage,
    clock,
    appVersion,
    ...(deps.autosaveDelayMs === undefined ? {} : { delayMs: deps.autosaveDelayMs }),
  });

  store.subscribe((s, prev) => {
    if (s.revision !== prev.revision && s.revision !== s.savedRevision) autosave.schedule();
  });

  return store;
}
