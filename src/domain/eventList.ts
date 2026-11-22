// Event list of the main screen (SPEC 5.2) and city suggestions of the event dialog (5.4).
import { compareISO, daysInMonth, toISO } from './dates.ts';
import type { MonthRef } from './segments.ts';
import type { Event } from './types.ts';

/** Events that touch the given month columns, sorted by start date (then id, for stability). */
export function eventsInPeriod(events: readonly Event[], months: readonly MonthRef[]): Event[] {
  const first = months[0];
  const last = months[months.length - 1];
  if (first === undefined || last === undefined) return [];
  const from = toISO(first.year, first.month, 1);
  const to = toISO(last.year, last.month, daysInMonth(last.year, last.month));
  return events
    .filter((e) => e.end >= from && e.start <= to)
    .sort((a, b) => compareISO(a.start, b.start) || compareISO(a.id, b.id));
}

/** Distinct non-empty cities of the given events, alphabetical. */
export function citySuggestions(events: readonly Pick<Event, 'city'>[]): string[] {
  const cities = new Set(events.map((e) => e.city.trim()).filter((c) => c !== ''));
  return [...cities].sort((a, b) => a.localeCompare(b, 'ru'));
}
