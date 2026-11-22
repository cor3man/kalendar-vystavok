// React access to the stores; the calendar store itself is created once in bootstrap.ts.
import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { CalendarState, CalendarStore } from './store.ts';
import type { UiState, UiStore } from './uiStore.ts';

export const StoreContext = createContext<CalendarStore | null>(null);
export const UiContext = createContext<UiStore | null>(null);

export function useStoreApi(): CalendarStore {
  const store = useContext(StoreContext);
  if (store === null) throw new Error('useStoreApi must be used inside <StoreProvider>');
  return store;
}

export function useCalendarStore<T>(selector: (state: CalendarState) => T): T {
  return useStore(useStoreApi(), selector);
}

export function useUiApi(): UiStore {
  const store = useContext(UiContext);
  if (store === null) throw new Error('useUiApi must be used inside <StoreProvider>');
  return store;
}

export function useUi<T>(selector: (state: UiState) => T): T {
  return useStore(useUiApi(), selector);
}
