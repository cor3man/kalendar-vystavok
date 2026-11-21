import { formatDateRange } from '../../domain/dateText.ts';
import { eventsInPeriod } from '../../domain/eventList.ts';
import type { DataFile, Id } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import type { GridGeometry } from '../../layout/shapes.ts';
import form from '../common/form.module.css';
import styles from './main.module.css';

interface EventListProps {
  data: DataFile;
  grid: GridGeometry;
  editable: boolean;
  onOpen: (id: Id) => void;
}

/** Events of the visible period sorted by start date (SPEC 5.2); held ones greyed. */
export function EventList({ data, grid, editable, onOpen }: EventListProps) {
  const events = eventsInPeriod(data.events, grid.months);
  const exhibitions = new Map(data.exhibitions.map((x) => [x.id, x]));
  const countries = new Map(data.countries.map((c) => [c.id, c]));
  const c = ru.eventList.columns;

  return (
    <section className={styles.panel} aria-labelledby="event-list-title">
      <h2 id="event-list-title" className={styles.panelTitle}>
        {ru.eventList.title}
      </h2>
      {events.length === 0 ? (
        <p className={styles.muted}>{ru.eventList.empty}</p>
      ) : (
        <table className={styles.table} data-testid="event-list">
          <thead>
            <tr>
              <th scope="col">
                <span className={form.visuallyHidden}>{c.color}</span>
              </th>
              <th scope="col">{c.name}</th>
              <th scope="col">{c.dates}</th>
              <th scope="col">{c.city}</th>
              <th scope="col">{c.country}</th>
              <th scope="col">{c.state}</th>
            </tr>
          </thead>
          <tbody>
            {events.map((e) => {
              const name = exhibitions.get(e.exhibitionId)?.name ?? '';
              return (
                <tr key={e.id} className={e.held ? styles.held : undefined} data-event-id={e.id}>
                  <td>
                    <span className={form.swatch} style={{ background: e.color }} />
                  </td>
                  <td>
                    {editable ? (
                      <button
                        type="button"
                        className={styles.rowButton}
                        onClick={() => {
                          onOpen(e.id);
                        }}
                      >
                        {name}
                      </button>
                    ) : (
                      name
                    )}
                  </td>
                  <td>{formatDateRange(e.start, e.end)}</td>
                  <td>{e.city}</td>
                  <td>{e.countryId === null ? '' : (countries.get(e.countryId)?.name ?? '')}</td>
                  <td>{e.held ? ru.eventList.held : ru.eventList.planned}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </section>
  );
}
