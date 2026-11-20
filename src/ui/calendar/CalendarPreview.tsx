import { useEffect, useMemo, useState } from 'react';
import { ru } from '../../i18n/ru.ts';
import { layoutCalendar } from '../../layout/layout.ts';
import type { TextMeasurer } from '../../layout/measure.ts';
import { createCanvasMeasurer } from '../../render/canvasMeasurer.ts';
import { CalendarSvg } from '../../render/svg/CalendarSvg.tsx';
import { todayISO } from '../../state/clock.ts';
import { useCalendarStore } from '../../state/store.ts';
import styles from './CalendarPreview.module.css';

/** Read-only preview of the page exactly as printed (SPEC 5.2). */
export function CalendarPreview() {
  const data = useCalendarStore((s) => s.data);
  const year = useCalendarStore((s) => s.year);
  const format = useCalendarStore((s) => s.format);
  const [measurer, setMeasurer] = useState<TextMeasurer | null>(null);

  useEffect(() => {
    let active = true;
    void createCanvasMeasurer().then((m) => {
      if (active) setMeasurer(m);
    });
    return () => {
      active = false;
    };
  }, []);

  const layout = useMemo(
    () =>
      measurer === null
        ? null
        : layoutCalendar({ data, year, format, exportDate: todayISO(), measurer }),
    [data, year, format, measurer],
  );

  return (
    <section className={styles.scroller} aria-label={ru.preview.label}>
      {layout === null ? (
        <p className={styles.loading}>{ru.preview.loading}</p>
      ) : (
        <div className={styles.page} data-testid="calendar-preview" data-format={format}>
          <CalendarSvg layout={layout} title={`${ru.preview.label} ${layout.page.title}`} />
        </div>
      )}
    </section>
  );
}
