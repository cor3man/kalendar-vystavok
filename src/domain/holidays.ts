// Default Belarus holidays (SPEC Appendix B, 5.8).
import { ru } from '../i18n/ru.ts';
import { addDays, compareISO, orthodoxEaster, toISO } from './dates.ts';
import type { Holiday } from './types.ts';

/** Fixed-date holidays as [month, day, label]. */
const FIXED: readonly (readonly [number, number, string])[] = [
  [1, 1, ''],
  [1, 2, ''],
  [1, 7, ''],
  [3, 8, ''],
  [5, 1, ''],
  [5, 9, ''],
  [7, 3, ''],
  [11, 7, ru.holidayLabels.november7],
  [12, 25, ''],
];

/** Radunitsa is the Tuesday nine days after Orthodox Easter. */
export const RADUNITSA_OFFSET_DAYS = 9;

/** Sorted by date, one entry per date (a labelled entry wins over an unlabelled one). */
export function belarusHolidays(year: number): Holiday[] {
  const easter = orthodoxEaster(year);
  const all: Holiday[] = [
    ...FIXED.map(([m, d, label]) => ({ date: toISO(year, m, d), label })),
    { date: easter, label: ru.holidayLabels.easter },
    { date: addDays(easter, RADUNITSA_OFFSET_DAYS), label: ru.holidayLabels.radunitsa },
  ];
  return dedupeByDate(all);
}

function dedupeByDate(holidays: readonly Holiday[]): Holiday[] {
  const byDate = new Map<string, Holiday>();
  for (const h of holidays) {
    const prev = byDate.get(h.date);
    if (prev === undefined || (prev.label === '' && h.label !== '')) byDate.set(h.date, h);
  }
  return sortHolidays([...byDate.values()]);
}

export function sortHolidays(holidays: readonly Holiday[]): Holiday[] {
  return [...holidays].sort((a, b) => compareISO(a.date, b.date));
}

/** Adds generated holidays whose date is not yet present; existing entries are kept as they are. */
export function mergeHolidays(
  existing: readonly Holiday[],
  generated: readonly Holiday[],
): Holiday[] {
  const dates = new Set(existing.map((h) => h.date));
  return sortHolidays([...existing, ...generated.filter((h) => !dates.has(h.date))]);
}
