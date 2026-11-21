import { ru } from '../../i18n/ru.ts';
import { FORMAT_IDS } from '../../layout/pageSpec.ts';
import { MAX_YEAR, MIN_YEAR, useCalendarStore } from '../../state/store.ts';
import type { FormatId } from '../../domain/types.ts';
import { PdfActions } from './PdfActions.tsx';
import styles from './Toolbar.module.css';

function isFormatId(value: string): value is FormatId {
  return (FORMAT_IDS as readonly string[]).includes(value);
}

export function Toolbar() {
  const year = useCalendarStore((s) => s.year);
  const format = useCalendarStore((s) => s.format);
  const setYear = useCalendarStore((s) => s.setYear);
  const setFormat = useCalendarStore((s) => s.setFormat);

  return (
    <div className={styles.toolbar} role="toolbar">
      <div className={styles.group}>
        <button
          type="button"
          className={styles.button}
          aria-label={ru.toolbar.prevYear}
          onClick={() => {
            setYear(year - 1);
          }}
        >
          ‹
        </button>
        <label className={styles.label}>
          <span className={styles.visuallyHidden}>{ru.toolbar.year}</span>
          <input
            className={styles.year}
            type="number"
            min={MIN_YEAR}
            max={MAX_YEAR}
            value={year}
            onChange={(e) => {
              setYear(e.currentTarget.valueAsNumber);
            }}
          />
        </label>
        <button
          type="button"
          className={styles.button}
          aria-label={ru.toolbar.nextYear}
          onClick={() => {
            setYear(year + 1);
          }}
        >
          ›
        </button>
      </div>
      <label className={styles.group}>
        <span className={styles.label}>{ru.toolbar.format}</span>
        <select
          className={styles.select}
          value={format}
          onChange={(e) => {
            const value = e.currentTarget.value;
            if (isFormatId(value)) setFormat(value);
          }}
        >
          {FORMAT_IDS.map((f) => (
            <option key={f} value={f}>
              {ru.formats[f]}
            </option>
          ))}
        </select>
      </label>
      <div className={styles.end}>
        <PdfActions />
      </div>
    </div>
  );
}
