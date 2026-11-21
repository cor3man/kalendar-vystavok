// React access to the store; the store itself is created once in bootstrap.ts.
import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { CalendarState, CalendarStore } from './store.ts';

export const StoreContext = createContext<CalendarStore | null>(null);

export function useStoreApi(): CalendarStore {
  const store = useContext(StoreContext);
  if (store === null) throw new Error('useStoreApi must be used inside <StoreProvider>');
  return store;
}

export function useCalendarStore<T>(selector: (state: CalendarState) => T): T {
  return useStore(useStoreApi(), selector);
}
