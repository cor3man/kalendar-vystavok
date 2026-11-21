import { useMemo } from 'react';
import { layoutCalendar } from '../../layout/layout.ts';
import type { LayoutResult } from '../../layout/shapes.ts';
import { todayISO } from '../../state/clock.ts';
import { useCalendarStore } from '../../state/storeContext.ts';
import { useMeasurer } from '../common/useMeasurer.ts';

/** Layout of the current data, year and format; shared by the preview and the warnings panel. */
export function useLayout(): LayoutResult | null {
  const data = useCalendarStore((s) => s.data);
  const year = useCalendarStore((s) => s.year);
  const format = useCalendarStore((s) => s.format);
  const measurer = useMeasurer();
  return useMemo(
    () =>
      measurer === null || data === null
        ? null
        : layoutCalendar({ data, year, format, exportDate: todayISO(), measurer }),
    [data, year, format, measurer],
  );
}
