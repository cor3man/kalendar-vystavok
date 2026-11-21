import { useState, type ReactNode } from 'react';
import type { CalendarStore } from './store.ts';
import { StoreContext, UiContext } from './storeContext.ts';
import { createUiStore } from './uiStore.ts';

export function StoreProvider({ store, children }: { store: CalendarStore; children: ReactNode }) {
  const [ui] = useState(createUiStore);
  return (
    <StoreContext value={store}>
      <UiContext value={ui}>{children}</UiContext>
    </StoreContext>
  );
}
