// Wires the store to the browser: storage adapter, tab lock, seed loader, page lifecycle.
import { systemClock } from '../storage/folderStorage.ts';
import { createFsAccessStorage, isFileSystemAccessSupported } from '../storage/fsAccessStorage.ts';
import { createMemoryStorage } from '../storage/memoryStorage.ts';
import { appVersion } from '../version.ts';
import { createIdGenerator } from './ids.ts';
import { createCalendarStore, hasUnsavedChanges, type CalendarStore } from './store.ts';
import { createWebTabLock } from './tabLock.ts';

/**
 * E2E tests inject `window.__KALENDAR_TEST__ = { storage: 'memory' }` before the app loads
 * (SPEC 7.2); it is not reachable from a URL.
 */
function wantsMemoryStorage(win: Window): boolean {
  return win.__KALENDAR_TEST__?.storage === 'memory';
}

export function createAppStore(win: Window = window): CalendarStore {
  const memory = wantsMemoryStorage(win);
  return createCalendarStore({
    storage: memory ? createMemoryStorage() : createFsAccessStorage(systemClock, win),
    // `locks` is missing in very old browsers even though the DOM types declare it.
    tabLock: createWebTabLock('locks' in win.navigator ? win.navigator.locks : undefined),
    clock: systemClock,
    appVersion,
    supported: memory || isFileSystemAccessSupported(win),
    // The only import of the seed: a separate chunk, fetched when a new folder is created.
    loadSeed: async (request) => (await import('../storage/seed.ts')).buildSeed(request),
    newId: createIdGenerator(),
  });
}

/** Saves when the tab is hidden and warns before closing it with unsaved changes (SPEC 7.1). */
export function installPageLifecycle(store: CalendarStore, win: Window = window): void {
  win.document.addEventListener('visibilitychange', () => {
    if (win.document.visibilityState === 'hidden') void store.getState().flushSave();
  });
  win.addEventListener('beforeunload', (event) => {
    if (hasUnsavedChanges(store.getState())) event.preventDefault();
  });
}
