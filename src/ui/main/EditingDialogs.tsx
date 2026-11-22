import { useCallback } from 'react';
import { isWritable } from '../../state/store.ts';
import { useCalendarStore, useUi, useUiApi } from '../../state/storeContext.ts';
import { CatalogueDialog } from '../catalogue/CatalogueDialog.tsx';
import { EventDialog } from '../dialogs/EventDialog.tsx';
import { HolidaysDialog } from '../holidays/HolidaysDialog.tsx';
import { DeleteToast } from './DeleteToast.tsx';
import { useUndoShortcuts } from './useUndoShortcuts.ts';

/** Mounts the editing dialogs and the delete toast; only while the data can be edited. */
export function EditingDialogs() {
  const ui = useUiApi();
  const data = useCalendarStore((s) => s.data);
  const editable = useCalendarStore(isWritable);
  const event = useUi((s) => s.event);
  const eventSeq = useUi((s) => s.eventSeq);
  const catalogueOpen = useUi((s) => s.catalogueOpen);
  const holidaysOpen = useUi((s) => s.holidaysOpen);
  const closeEvent = useCallback(() => {
    ui.getState().closeEvent();
  }, [ui]);
  useUndoShortcuts(editable);

  if (!editable || data === null) return null;
  return (
    <>
      {catalogueOpen && (
        <CatalogueDialog
          onClose={() => {
            ui.getState().setCatalogueOpen(false);
          }}
        />
      )}
      {holidaysOpen && (
        <HolidaysDialog
          onClose={() => {
            ui.getState().setHolidaysOpen(false);
          }}
        />
      )}
      {event !== null && (
        <EventDialog key={eventSeq} request={event} data={data} onClose={closeEvent} />
      )}
      <DeleteToast />
    </>
  );
}
