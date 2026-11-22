// App updates (SPEC 5.9): the "new version available" banner. The service worker is wired in
// src/pwa/registerSw.ts; this store only decides when the page may reload: never while a dialog
// is open, and only after pending changes were written.
import { createStore, type StoreApi } from 'zustand/vanilla';

export interface UpdateDeps {
  /** Saves pending changes; a reload must not lose them. */
  flush: () => Promise<void>;
  reload: () => void;
}

export interface UpdateState {
  /** A new version is installed and waiting. */
  available: boolean;
  /** The update button was pressed; waiting for the new version to take over. */
  updating: boolean;
  /** The new version controls the page; reload as soon as no dialog is open. */
  reloadPending: boolean;
  /** Modal dialogs currently open (all go through ui/common/Dialog). */
  openDialogs: number;
  /** Activates the waiting version; set by the service-worker wiring. */
  activate: (() => Promise<void>) | null;

  setAvailable: (activate: () => Promise<void>) => void;
  /** The banner's update button. */
  update: () => Promise<void>;
  /** The new version took control of the page (also when another window started the update). */
  requestReload: () => void;
  dialogOpened: () => void;
  dialogClosed: () => void;
}

export type UpdateStore = StoreApi<UpdateState>;

export function createUpdateStore(deps: UpdateDeps): UpdateStore {
  let reloading = false;

  return createStore<UpdateState>()((set, get) => {
    async function reloadIfIdle(): Promise<void> {
      const s = get();
      if (!s.reloadPending || s.openDialogs > 0 || reloading) return;
      reloading = true;
      await deps.flush();
      // A dialog may have opened while saving; then wait for it to close.
      if (get().openDialogs > 0) {
        reloading = false;
        return;
      }
      deps.reload();
    }

    return {
      available: false,
      updating: false,
      reloadPending: false,
      openDialogs: 0,
      activate: null,

      setAvailable: (activate) => {
        set({ available: true, activate });
      },
      update: async () => {
        const { activate, updating } = get();
        if (activate === null || updating) return;
        set({ updating: true });
        await deps.flush();
        await activate();
      },
      requestReload: () => {
        set({ reloadPending: true });
        void reloadIfIdle();
      },
      dialogOpened: () => {
        set({ openDialogs: get().openDialogs + 1 });
      },
      dialogClosed: () => {
        set({ openDialogs: Math.max(0, get().openDialogs - 1) });
        void reloadIfIdle();
      },
    };
  });
}
