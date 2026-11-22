import { useState, type ReactNode } from 'react';
import type { CalendarStore } from './store.ts';
import { StoreContext, UiContext, UpdateContext } from './storeContext.ts';
import { createUiStore } from './uiStore.ts';
import type { UpdateStore } from './updateStore.ts';

export function StoreProvider({
  store,
  update,
  children,
}: {
  store: CalendarStore;
  update: UpdateStore;
  children: ReactNode;
}) {
  const [ui] = useState(createUiStore);
  return (
    <StoreContext value={store}>
      <UiContext value={ui}>
        <UpdateContext value={update}>{children}</UpdateContext>
      </UiContext>
    </StoreContext>
  );
}
