import type { ReactNode } from 'react';
import type { CalendarStore } from './store.ts';
import { StoreContext } from './storeContext.ts';

export function StoreProvider({ store, children }: { store: CalendarStore; children: ReactNode }) {
  return <StoreContext value={store}>{children}</StoreContext>;
}
