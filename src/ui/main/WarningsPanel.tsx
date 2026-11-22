import { formatDateRange } from '../../domain/dateText.ts';
import type { DataFile, Id, Warning } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import controls from '../common/controls.module.css';
import styles from './main.module.css';

interface WarningsPanelProps {
  warnings: readonly Warning[];
  data: DataFile;
  editable: boolean;
  onOpenEvent: (id: Id) => void;
  onOpenHolidays: () => void;
}

/** SPEC 5.7: listed only when present; clicking a warning opens its event. Never blocks printing. */
export function WarningsPanel({
  warnings,
  data,
  editable,
  onOpenEvent,
  onOpenHolidays,
}: WarningsPanelProps) {
  if (warnings.length === 0) return null;
  const exhibitions = new Map(data.exhibitions.map((x) => [x.id, x]));
  const events = new Map(data.events.map((e) => [e.id, e]));

  function label(id: Id): string {
    const e = events.get(id);
    if (e === undefined) return '';
    return `${exhibitions.get(e.exhibitionId)?.name ?? ''}, ${formatDateRange(e.start, e.end)}`;
  }

  function describe(w: Warning): { text: string; open: () => void } {
    switch (w.kind) {
      case 'textOverflow':
        return {
          text: ru.warnings.textOverflow(label(w.eventId)),
          open: () => {
            onOpenEvent(w.eventId);
          },
        };
      case 'missingFlag':
        return {
          text: ru.warnings.missingFlag(label(w.eventId)),
          open: () => {
            onOpenEvent(w.eventId);
          },
        };
      case 'tripleOverlap': {
        const names = w.eventIds.map(
          (id) => exhibitions.get(events.get(id)?.exhibitionId ?? '')?.name ?? '',
        );
        const first = w.eventIds[0];
        return {
          text: ru.warnings.tripleOverlap(names.join(', ')),
          open: () => {
            if (first !== undefined) onOpenEvent(first);
          },
        };
      }
      case 'noHolidays':
        return { text: ru.warnings.noHolidays(w.year), open: onOpenHolidays };
    }
  }

  return (
    <section
      className={[styles.panel, styles.warnings].join(' ')}
      aria-labelledby="warnings-title"
      data-testid="warnings"
    >
      <h2 id="warnings-title" className={styles.panelTitle}>
        {ru.warnings.title}
      </h2>
      <ul className={styles.warningList}>
        {warnings.map((w, i) => {
          const { text, open } = describe(w);
          return (
            <li key={i}>
              {editable ? (
                <button type="button" className={controls.link} onClick={open}>
                  {text}
                </button>
              ) : (
                text
              )}
            </li>
          );
        })}
      </ul>
      <p className={controls.hint}>{ru.warnings.hint}</p>
    </section>
  );
}
