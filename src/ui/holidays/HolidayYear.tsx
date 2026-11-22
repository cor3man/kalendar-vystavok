import { useState, type SyntheticEvent } from 'react';
import { formatDMY, weekday } from '../../domain/dates.ts';
import type { Holiday, ISODate } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import { useStoreApi } from '../../state/storeContext.ts';
import controls from '../common/controls.module.css';
import { editErrorText } from '../common/editErrorText.ts';
import form from '../common/form.module.css';
import styles from './holidays.module.css';

interface HolidayYearProps {
  year: number;
  holidays: readonly Holiday[];
}

/** One year of the holiday table (SPEC 5.8): date, label, delete; add a row; Belarus defaults. */
export function HolidayYear({ year, holidays }: HolidayYearProps) {
  const store = useStoreApi();
  const [date, setDate] = useState<ISODate>('');
  const [label, setLabel] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);

  function show(text: string, error = false) {
    setMessage({ text, error });
  }

  function onAdd(e: SyntheticEvent) {
    e.preventDefault();
    const error = store.getState().saveHoliday(null, { date, label });
    if (error !== null) {
      show(editErrorText(error), true);
      return;
    }
    setDate('');
    setLabel('');
    setMessage(null);
  }

  function onLabel(h: Holiday, next: string) {
    if (next.trim() === h.label) return;
    const error = store.getState().saveHoliday(h.date, { date: h.date, label: next });
    if (error !== null) show(editErrorText(error), true);
  }

  function onFill() {
    const added = store.getState().fillHolidays(year);
    show(added > 0 ? ru.holidays.filled(added) : ru.holidays.nothingToFill);
  }

  return (
    <section className={styles.year} data-testid={`holidays-${String(year)}`}>
      <div className={styles.yearHeader}>
        <h3 className={styles.yearTitle}>{ru.holidays.yearTitle(year)}</h3>
        <button type="button" className={controls.button} onClick={onFill}>
          {ru.holidays.fill}
        </button>
      </div>
      {holidays.length === 0 ? (
        <p className={controls.hint}>{ru.holidays.empty}</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">{ru.holidays.date}</th>
              <th scope="col">{ru.holidays.label}</th>
              <th scope="col">
                <span className={form.visuallyHidden}>{ru.common.delete}</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {holidays.map((h) => (
              <tr key={h.date}>
                <td>
                  {formatDMY(h.date)} {ru.weekdaysShort[weekday(h.date)]}
                </td>
                <td>
                  <input
                    // Remount when the label changes outside (undo), so the field shows it.
                    key={h.label}
                    className={form.input}
                    type="text"
                    defaultValue={h.label}
                    aria-label={`${ru.holidays.label} ${formatDMY(h.date)}`}
                    onBlur={(e) => {
                      onLabel(h, e.currentTarget.value);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        onLabel(h, e.currentTarget.value);
                      }
                    }}
                  />
                </td>
                <td>
                  <button
                    type="button"
                    className={controls.link}
                    aria-label={ru.holidays.deleteLabel(formatDMY(h.date))}
                    onClick={() => {
                      const error = store.getState().deleteHoliday(h.date);
                      if (error !== null) show(editErrorText(error), true);
                    }}
                  >
                    {ru.common.delete}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      <form className={styles.addRow} onSubmit={onAdd}>
        <label className={form.field}>
          <span className={form.label}>{ru.holidays.date}</span>
          <input
            className={form.input}
            type="date"
            min={`${String(year)}-01-01`}
            max={`${String(year)}-12-31`}
            value={date}
            onChange={(e) => {
              setDate(e.currentTarget.value);
            }}
          />
        </label>
        <label className={form.field}>
          <span className={form.label}>{ru.holidays.label}</span>
          <input
            className={form.input}
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.currentTarget.value);
            }}
          />
        </label>
        <button type="submit" className={controls.button}>
          {ru.common.add}
        </button>
      </form>
      {message !== null && (
        <p className={message.error ? form.error : controls.hint} role="status">
          {message.text}
        </p>
      )}
    </section>
  );
}
