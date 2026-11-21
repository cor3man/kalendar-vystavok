// Human-readable dates for the UI (SPEC 5): "16–18 марта 2027", "31 марта – 2 апреля 2027".
import { ru } from '../i18n/ru.ts';
import { compareISO, parseISO, type YMD } from './dates.ts';
import type { ISODate } from './types.ts';

function dayMonth({ day, month }: YMD): string {
  return `${String(day)} ${ru.monthsGenitive[month - 1] ?? ''}`;
}

/** A date range in words; the order of the arguments does not matter. */
export function formatDateRange(a: ISODate, b: ISODate): string {
  const [start, end] = compareISO(a, b) <= 0 ? [a, b] : [b, a];
  const s = parseISO(start);
  const e = parseISO(end);
  if (start === end) return `${dayMonth(s)} ${String(s.year)}`;
  if (s.year === e.year && s.month === e.month) {
    return `${String(s.day)}–${dayMonth(e)} ${String(e.year)}`;
  }
  if (s.year === e.year) return `${dayMonth(s)} – ${dayMonth(e)} ${String(e.year)}`;
  return `${dayMonth(s)} ${String(s.year)} – ${dayMonth(e)} ${String(e.year)}`;
}
