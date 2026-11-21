import type { Holiday } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import { pageMonths } from '../../layout/pageSpec.ts';
import { useCalendarStore } from '../../state/storeContext.ts';
import controls from '../common/controls.module.css';
import { Dialog } from '../common/Dialog.tsx';
import { HolidayYear } from './HolidayYear.tsx';

const NO_HOLIDAYS: readonly Holiday[] = [];

/** SPEC 5.8: the holidays of the visible years (a modal dialog, approved M4). */
export function HolidaysDialog({ onClose }: { onClose: () => void }) {
  const holidays = useCalendarStore((s) => s.data?.holidays ?? NO_HOLIDAYS);
  const year = useCalendarStore((s) => s.year);
  const format = useCalendarStore((s) => s.format);
  const years = [...new Set(pageMonths(format, year).map((m) => m.year))];

  return (
    <Dialog
      title={ru.holidays.title}
      testId="holidays-dialog"
      onClose={onClose}
      actions={
        <button type="button" className={controls.button} onClick={onClose}>
          {ru.common.close}
        </button>
      }
    >
      <p className={controls.hint}>{ru.holidays.labelHint}</p>
      {years.map((y) => (
        <HolidayYear
          key={y}
          year={y}
          holidays={holidays.filter((h) => h.date.startsWith(`${String(y)}-`))}
        />
      ))}
    </Dialog>
  );
}
