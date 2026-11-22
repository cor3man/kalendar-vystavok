// Undo / redo history (SPEC 5.6): the last 20 data changes, in memory for the session.
// Snapshots leave out `settings`: changing the year or format is not an undo step (SPEC 4.3).
import type { DataFile } from '../domain/types.ts';

export const HISTORY_LIMIT = 20;

export type Snapshot = Pick<DataFile, 'countries' | 'exhibitions' | 'events' | 'holidays'>;

export interface History {
  /** Oldest first. */
  past: readonly Snapshot[];
  /** Next redo first. */
  future: readonly Snapshot[];
}

export const EMPTY_HISTORY: History = { past: [], future: [] };

export function snapshotOf(data: DataFile): Snapshot {
  return {
    countries: data.countries,
    exhibitions: data.exhibitions,
    events: data.events,
    holidays: data.holidays,
  };
}

/** Records the state before a change; a new change drops the redo steps. */
export function record(history: History, before: Snapshot): History {
  return { past: [...history.past, before].slice(-HISTORY_LIMIT), future: [] };
}

export interface Step {
  history: History;
  /** The snapshot to apply. */
  snapshot: Snapshot;
}

export function undoStep(history: History, current: Snapshot): Step | null {
  const snapshot = history.past[history.past.length - 1];
  if (snapshot === undefined) return null;
  return {
    history: { past: history.past.slice(0, -1), future: [current, ...history.future] },
    snapshot,
  };
}

export function redoStep(history: History, current: Snapshot): Step | null {
  const [snapshot, ...future] = history.future;
  if (snapshot === undefined) return null;
  return { history: { past: [...history.past, current].slice(-HISTORY_LIMIT), future }, snapshot };
}
