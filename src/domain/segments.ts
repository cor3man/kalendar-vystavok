// Events → segments → clusters → lanes (SPEC 3.5).
import { daysInMonth, maxISO, minISO, parseISO, toISO } from './dates.ts';
import type { Event, Id } from './types.ts';

/** One month column of a page. */
export interface MonthRef {
  year: number;
  /** 1–12 */
  month: number;
}

/** The part of an event inside one month column. */
export interface Segment {
  eventId: Id;
  /** Index into the page's month columns. */
  column: number;
  /** Day of month, 1-based, inclusive. */
  startDay: number;
  /** Day of month, 1-based, inclusive. */
  endDay: number;
  /** Longest visible segment of its event (earlier one on a tie). */
  isPrimary: boolean;
  /** 0-based lane inside its cluster. */
  lane: number;
  /** Lanes used by its cluster (n). */
  laneCount: number;
}

export interface Cluster {
  column: number;
  laneCount: number;
  eventIds: Id[];
}

export interface SegmentLayout {
  segments: Segment[];
  clusters: Cluster[];
}

export function segmentDays(s: Pick<Segment, 'startDay' | 'endDay'>): number {
  return s.endDay - s.startDay + 1;
}

type RawSegment = Pick<Segment, 'eventId' | 'column' | 'startDay' | 'endDay'>;

/** Splits one event into per-column segments, cut to the visible months. */
export function splitEvent(
  event: Pick<Event, 'id' | 'start' | 'end'>,
  months: readonly MonthRef[],
): RawSegment[] {
  const out: RawSegment[] = [];
  months.forEach(({ year, month }, column) => {
    const first = toISO(year, month, 1);
    const last = toISO(year, month, daysInMonth(year, month));
    if (event.end < first || event.start > last) return;
    out.push({
      eventId: event.id,
      column,
      startDay: parseISO(maxISO(event.start, first)).day,
      endDay: parseISO(minISO(event.end, last)).day,
    });
  });
  return out;
}

/** Index of the primary segment: the longest, the earlier one on a tie. */
export function primaryIndex(segments: readonly Pick<Segment, 'startDay' | 'endDay'>[]): number {
  let best = -1;
  let bestDays = 0;
  segments.forEach((s, i) => {
    const d = segmentDays(s);
    if (d > bestDays) {
      best = i;
      bestDays = d;
    }
  });
  return best;
}

function compareInColumn(a: RawSegment, b: RawSegment): number {
  if (a.startDay !== b.startDay) return a.startDay - b.startDay;
  const len = segmentDays(b) - segmentDays(a);
  if (len !== 0) return len;
  return a.eventId < b.eventId ? -1 : a.eventId > b.eventId ? 1 : 0;
}

interface Placed {
  raw: RawSegment;
  lane: number;
}

/** Groups one column's segments into overlap clusters and assigns lanes greedily. */
function layoutColumn(
  column: number,
  raws: readonly RawSegment[],
): { placed: (Placed & { laneCount: number })[]; clusters: Cluster[] } {
  const sorted = [...raws].sort(compareInColumn);
  const placed: (Placed & { laneCount: number })[] = [];
  const clusters: Cluster[] = [];

  let current: Placed[] = [];
  let laneEnds: number[] = [];
  let clusterEnd = -1;

  const flush = (): void => {
    if (current.length === 0) return;
    const laneCount = laneEnds.length;
    for (const p of current) placed.push({ ...p, laneCount });
    clusters.push({ column, laneCount, eventIds: current.map((p) => p.raw.eventId) });
    current = [];
    laneEnds = [];
  };

  for (const raw of sorted) {
    if (raw.startDay > clusterEnd) flush();
    let lane = laneEnds.findIndex((end) => end < raw.startDay);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(raw.endDay);
    } else {
      laneEnds[lane] = raw.endDay;
    }
    current.push({ raw, lane });
    clusterEnd = Math.max(clusterEnd, raw.endDay);
  }
  flush();
  return { placed, clusters };
}

/** Full segment layout of a page: every visible segment with its lane and the clusters. */
export function layoutSegments(
  events: readonly Pick<Event, 'id' | 'start' | 'end'>[],
  months: readonly MonthRef[],
): SegmentLayout {
  const primaryKey = new Set<string>();
  const byColumn = new Map<number, RawSegment[]>();

  for (const event of events) {
    const parts = splitEvent(event, months);
    const p = parts[primaryIndex(parts)];
    if (p !== undefined) primaryKey.add(`${p.eventId}@${String(p.column)}`);
    for (const part of parts) {
      const list = byColumn.get(part.column) ?? [];
      list.push(part);
      byColumn.set(part.column, list);
    }
  }

  const segments: Segment[] = [];
  const clusters: Cluster[] = [];
  for (const column of [...byColumn.keys()].sort((a, b) => a - b)) {
    const result = layoutColumn(column, byColumn.get(column) ?? []);
    for (const { raw, lane, laneCount } of result.placed) {
      segments.push({
        ...raw,
        lane,
        laneCount,
        isPrimary: primaryKey.has(`${raw.eventId}@${String(raw.column)}`),
      });
    }
    clusters.push(...result.clusters);
  }
  return { segments, clusters };
}
