// Click, then Shift+click day selection (SPEC 5.3), as a pure function of the marked first day.
import { normalizeRange } from '../../domain/editing.ts';
import type { Id, ISODate } from '../../domain/types.ts';

export interface ClickInput {
  day: ISODate;
  /** Event under the pointer, if any. */
  eventId: Id | null;
  shift: boolean;
}

export type ClickAction =
  | { kind: 'none' }
  | { kind: 'create'; start: ISODate; end: ISODate }
  | { kind: 'edit'; eventId: Id };

export interface ClickResult {
  /** The marked first day after the click; null = no mark. */
  start: ISODate | null;
  action: ClickAction;
}

export function clickShift(start: ISODate | null, input: ClickInput): ClickResult {
  if (input.shift) {
    // Shift+click counts as a day even over an event; without a mark it only sets one.
    if (start === null) return { start: input.day, action: { kind: 'none' } };
    return { start: null, action: { kind: 'create', ...normalizeRange(start, input.day) } };
  }
  if (input.eventId !== null) {
    return { start: null, action: { kind: 'edit', eventId: input.eventId } };
  }
  return { start: input.day, action: { kind: 'none' } };
}
