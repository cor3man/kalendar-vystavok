import { formatDateRange } from '../../domain/dateText.ts';
import type { DataFile, Event } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import styles from './catalogue.module.css';

/** SPEC 4.1: explains which events keep an item from being deleted. */
export function InUseMessage({ data, events }: { data: DataFile; events: readonly Event[] }) {
  const names = new Map(data.exhibitions.map((x) => [x.id, x.name]));
  return (
    <div className={styles.message} role="alert">
      {ru.editErrors.inUse} {ru.catalogue.usedBy}
      <ul>
        {events.map((e) => (
          <li key={e.id}>
            {names.get(e.exhibitionId) ?? ''}, {formatDateRange(e.start, e.end)}
          </li>
        ))}
      </ul>
    </div>
  );
}
