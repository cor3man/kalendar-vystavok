// The one place that reads the wall clock; domain and layout receive the date injected (CLAUDE.md).
import { toISO } from '../domain/dates.ts';
import type { ISODate } from '../domain/types.ts';

/** Today's local calendar date. Local getters are correct here: "today" is the user's day. */
export function todayISO(now: Date = new Date()): ISODate {
  return toISO(now.getFullYear(), now.getMonth() + 1, now.getDate());
}
