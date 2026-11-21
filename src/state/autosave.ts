// Autosave (SPEC 4.3): debounced 800 ms after every change; a failed save keeps the data in
// memory and is retried on the next change; an external change stops autosave until resolved.
import type { DataFile } from '../domain/types.ts';
import { ExternalChangeError } from '../storage/errors.ts';
import type { Clock } from '../storage/folderStorage.ts';
import type { Storage } from '../storage/Storage.ts';

export const AUTOSAVE_DELAY_MS = 800;

/** The part of the store autosave reads and writes. */
export interface AutosaveState {
  data: DataFile | null;
  /** Saving is allowed only in this state. */
  canSave: boolean;
  /** Incremented on every data change. */
  revision: number;
  /** Revision last written to disk. */
  savedRevision: number;
  saving: boolean;
  saveError: 'failed' | 'conflict' | null;
  lastSavedAt: number | null;
}

export interface AutosaveDeps {
  get: () => AutosaveState;
  set: (patch: Partial<AutosaveState>) => void;
  storage: Storage;
  clock: Clock;
  appVersion: string;
  delayMs?: number;
}

export interface Autosave {
  /** Restarts the debounce timer. */
  schedule(): void;
  /** Saves pending changes now and waits for the write. */
  flush(): Promise<void>;
  /** Writes the in-memory data over an externally changed file (conflict: "overwrite"). */
  overwrite(): Promise<void>;
  dispose(): void;
}

/** Stamps the save time and the app version (SPEC 4.1). */
export function stampForSave(data: DataFile, nowMs: number, appVersion: string): DataFile {
  return { ...data, savedAt: new Date(nowMs).toISOString(), appVersion };
}

export function createAutosave(deps: AutosaveDeps): Autosave {
  const { get, set, storage, clock, appVersion } = deps;
  const delay = deps.delayMs ?? AUTOSAVE_DELAY_MS;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;

  function clearTimer() {
    if (timer !== null) clearTimeout(timer);
    timer = null;
  }

  async function write(force: boolean): Promise<void> {
    const s = get();
    if (s.data === null) return;
    const revision = s.revision;
    set({ saving: true });
    try {
      await storage.save(stampForSave(s.data, clock.now(), appVersion), { force });
      set({ savedRevision: revision, saveError: null, lastSavedAt: storage.info().lastSavedAt });
    } catch (error: unknown) {
      if (error instanceof ExternalChangeError) {
        set({ saveError: 'conflict' });
      } else {
        console.error('Autosave failed', error);
        set({ saveError: 'failed' });
      }
    } finally {
      set({ saving: false });
    }
  }

  async function run(force: boolean): Promise<void> {
    clearTimer();
    while (inFlight !== null) await inFlight;
    const s = get();
    if (!s.canSave || s.data === null) return;
    if (!force && (s.saveError === 'conflict' || s.revision === s.savedRevision)) return;
    const savedFrom = s.revision;
    inFlight = write(force);
    try {
      await inFlight;
    } finally {
      inFlight = null;
    }
    // Changes made while writing get their own save.
    const after = get();
    if (after.saveError === null && after.revision !== savedFrom) schedule();
  }

  function schedule() {
    clearTimer();
    timer = setTimeout(() => {
      timer = null;
      void run(false);
    }, delay);
  }

  return {
    schedule,
    flush: () => run(false),
    overwrite: () => run(true),
    dispose: clearTimer,
  };
}
