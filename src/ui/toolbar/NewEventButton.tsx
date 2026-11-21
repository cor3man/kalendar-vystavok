import { daysInMonth, toISO } from '../../domain/dates.ts';
import { ru } from '../../i18n/ru.ts';
import { pageMonths } from '../../layout/pageSpec.ts';
import { todayISO } from '../../state/clock.ts';
import { isWritable } from '../../state/store.ts';
import { useCalendarStore, useStoreApi, useUiApi } from '../../state/storeContext.ts';
import styles from './Toolbar.module.css';

/** Today when it is on the page, otherwise the first day of the page. */
function defaultDay(format: Parameters<typeof pageMonths>[0], year: number): string {
  const months = pageMonths(format, year);
  const first = months[0];
  const last = months[months.length - 1];
  const today = todayISO();
  if (first === undefined || last === undefined) return today;
  const from = toISO(first.year, first.month, 1);
  const to = toISO(last.year, last.month, daysInMonth(last.year, last.month));
  return today >= from && today <= to ? today : from;
}

/** Toolbar "+ Выставка" (SPEC 5.2): a new event on today, or on the first day of the page. */
export function NewEventButton() {
  const ui = useUiApi();
  const store = useStoreApi();
  const editable = useCalendarStore(isWritable);
  return (
    <button
      type="button"
      className={styles.button}
      disabled={!editable}
      onClick={() => {
        const { format, year } = store.getState();
        const day = defaultDay(format, year);
        ui.getState().openEvent({ kind: 'new', start: day, end: day });
      }}
    >
      {ru.editing.newEvent}
    </button>
  );
}
