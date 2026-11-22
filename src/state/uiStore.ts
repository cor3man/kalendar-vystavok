// Session-only UI state: which dialog is open and the delete toast. No data lives here; data
// changes go through the calendar store (CLAUDE.md).
import { createStore, type StoreApi } from 'zustand/vanilla';
import type { EventDraft } from '../domain/editing.ts';
import type { Id, ISODate } from '../domain/types.ts';

export type EventRequest =
  | { kind: 'new'; start: ISODate; end: ISODate }
  /** "Копировать на следующий год": a new event prefilled from a copy, shown for confirmation. */
  | { kind: 'copy'; draft: EventDraft }
  | { kind: 'edit'; id: Id };

/** Toast «Удалено. Отменить» (SPEC 5.4), valid while no other edit was made. */
export interface DeleteToast {
  /** `editCount` of the calendar store right after the delete. */
  editCount: number;
}

export interface UiState {
  event: EventRequest | null;
  /** Increments on every openEvent, so a new request remounts the dialog. */
  eventSeq: number;
  catalogueOpen: boolean;
  holidaysOpen: boolean;
  toast: DeleteToast | null;
  openEvent: (request: EventRequest) => void;
  closeEvent: () => void;
  setCatalogueOpen: (open: boolean) => void;
  setHolidaysOpen: (open: boolean) => void;
  showToast: (toast: DeleteToast | null) => void;
}

export type UiStore = StoreApi<UiState>;

export function createUiStore(): UiStore {
  return createStore<UiState>()((set, get) => ({
    event: null,
    eventSeq: 0,
    catalogueOpen: false,
    holidaysOpen: false,
    toast: null,
    openEvent: (event) => {
      set({ event, eventSeq: get().eventSeq + 1 });
    },
    closeEvent: () => {
      set({ event: null });
    },
    setCatalogueOpen: (catalogueOpen) => {
      set({ catalogueOpen });
    },
    setHolidaysOpen: (holidaysOpen) => {
      set({ holidaysOpen });
    },
    showToast: (toast) => {
      set({ toast });
    },
  }));
}
