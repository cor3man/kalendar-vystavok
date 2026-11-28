import { isWritable } from '../../state/store.ts';
import { useCalendarStore, useUiApi, useUpdate } from '../../state/storeContext.ts';
import { CalendarPreview } from '../calendar/CalendarPreview.tsx';
import { useLayout } from '../calendar/useLayout.ts';
import { EventList } from './EventList.tsx';
import { WarningsPanel } from './WarningsPanel.tsx';

/** SPEC 5.2: calendar preview, warnings panel, event list. */
export function MainScreen() {
  const layout = useLayout();
  const data = useCalendarStore((s) => s.data);
  const editable = useCalendarStore(isWritable);
  const mode = useCalendarStore((s) => s.data?.settings.selectionMode ?? 'click-shift');
  const dialogOpen = useUpdate((s) => s.openDialogs > 0);
  const ui = useUiApi();
  const openEvent = (id: string) => {
    ui.getState().openEvent({ kind: 'edit', id });
  };

  return (
    <>
      <CalendarPreview
        layout={layout}
        editable={editable}
        paused={dialogOpen}
        mode={mode}
        onCreate={(start, end) => {
          ui.getState().openEvent({ kind: 'new', start, end });
        }}
        onEdit={openEvent}
      />
      {layout !== null && data !== null && (
        <>
          <WarningsPanel
            warnings={layout.warnings}
            data={data}
            editable={editable}
            onOpenEvent={openEvent}
            onOpenHolidays={() => {
              ui.getState().setHolidaysOpen(true);
            }}
          />
          <EventList data={data} grid={layout.grid} editable={editable} onOpen={openEvent} />
        </>
      )}
    </>
  );
}
