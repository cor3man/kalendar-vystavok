import { describe, expect, it } from 'vitest';
import {
  layoutSegments,
  primaryIndex,
  splitEvent,
  type MonthRef,
} from '../../../src/domain/segments.ts';

const year2027: MonthRef[] = Array.from({ length: 12 }, (_, i) => ({ year: 2027, month: i + 1 }));
const split2027: MonthRef[] = [
  ...Array.from({ length: 6 }, (_, i) => ({ year: 2027, month: i + 7 })),
  ...Array.from({ length: 6 }, (_, i) => ({ year: 2028, month: i + 1 })),
];

function ev(id: string, start: string, end: string) {
  return { id, start, end };
}

function lanes(events: ReturnType<typeof ev>[], months = year2027) {
  return layoutSegments(events, months).segments.map((s) => ({
    id: s.eventId,
    col: s.column,
    days: [s.startDay, s.endDay],
    lane: s.lane,
    n: s.laneCount,
    primary: s.isPrimary,
  }));
}

describe('splitEvent', () => {
  it('keeps a one-month event whole', () => {
    expect(splitEvent(ev('a', '2027-03-16', '2027-03-18'), year2027)).toEqual([
      { eventId: 'a', column: 2, startDay: 16, endDay: 18 },
    ]);
  });

  it('splits at a month boundary', () => {
    expect(splitEvent(ev('a', '2027-03-31', '2027-04-02'), year2027)).toEqual([
      { eventId: 'a', column: 2, startDay: 31, endDay: 31 },
      { eventId: 'a', column: 3, startDay: 1, endDay: 2 },
    ]);
  });

  it('splits at a year boundary on the split page', () => {
    expect(splitEvent(ev('a', '2027-12-30', '2028-01-02'), split2027)).toEqual([
      { eventId: 'a', column: 5, startDay: 30, endDay: 31 },
      { eventId: 'a', column: 6, startDay: 1, endDay: 2 },
    ]);
  });

  it('cuts events reaching outside the page and drops invisible ones', () => {
    const h1 = year2027.slice(0, 6);
    expect(splitEvent(ev('a', '2027-06-29', '2027-07-03'), h1)).toEqual([
      { eventId: 'a', column: 5, startDay: 29, endDay: 30 },
    ]);
    expect(splitEvent(ev('b', '2026-12-30', '2027-01-01'), year2027)).toEqual([
      { eventId: 'b', column: 0, startDay: 1, endDay: 1 },
    ]);
    expect(splitEvent(ev('c', '2027-08-01', '2027-08-03'), h1)).toEqual([]);
  });
});

describe('primaryIndex', () => {
  it('takes the longest segment, the earlier one on a tie', () => {
    expect(
      primaryIndex([
        { startDay: 31, endDay: 31 },
        { startDay: 1, endDay: 2 },
      ]),
    ).toBe(1);
    expect(
      primaryIndex([
        { startDay: 30, endDay: 31 },
        { startDay: 1, endDay: 2 },
      ]),
    ).toBe(0);
    expect(primaryIndex([])).toBe(-1);
  });
});

describe('layoutSegments', () => {
  it('gives a lone event one full lane', () => {
    expect(lanes([ev('a', '2027-03-16', '2027-03-18')])).toEqual([
      { id: 'a', col: 2, days: [16, 18], lane: 0, n: 1, primary: true },
    ]);
  });

  it('marks only the primary segment of a cross-month event', () => {
    expect(lanes([ev('a', '2027-03-31', '2027-04-02')]).map((s) => s.primary)).toEqual([
      false,
      true,
    ]);
  });

  it('splits two overlapping events into two lanes', () => {
    // Reference: TransLogistica Caspian 2–4 Jun and CeMAT Asia 3–5 Jun.
    expect(
      lanes([ev('cemat', '2027-06-03', '2027-06-05'), ev('caspian', '2027-06-02', '2027-06-04')]),
    ).toEqual([
      { id: 'caspian', col: 5, days: [2, 4], lane: 0, n: 2, primary: true },
      { id: 'cemat', col: 5, days: [3, 5], lane: 1, n: 2, primary: true },
    ]);
  });

  it('sorts same-start segments longer first', () => {
    const out = lanes([
      ev('short', '2027-01-10', '2027-01-11'),
      ev('long', '2027-01-10', '2027-01-15'),
    ]);
    expect(out.map((s) => [s.id, s.lane])).toEqual([
      ['long', 0],
      ['short', 1],
    ]);
  });

  it('chains clusters through a middle event and reuses free lanes', () => {
    // A overlaps B, B overlaps C, A and C do not overlap: one cluster, two lanes.
    const out = lanes([
      ev('A', '2027-01-01', '2027-01-05'),
      ev('B', '2027-01-04', '2027-01-08'),
      ev('C', '2027-01-07', '2027-01-10'),
    ]);
    expect(out.map((s) => [s.id, s.lane, s.n])).toEqual([
      ['A', 0, 2],
      ['B', 1, 2],
      ['C', 0, 2],
    ]);
  });

  it('allows three lanes and reports the cluster', () => {
    const events = [
      ev('a', '2027-02-01', '2027-02-03'),
      ev('b', '2027-02-02', '2027-02-04'),
      ev('c', '2027-02-03', '2027-02-05'),
    ];
    const { segments, clusters } = layoutSegments(events, year2027);
    expect(segments.map((s) => [s.eventId, s.lane, s.laneCount])).toEqual([
      ['a', 0, 3],
      ['b', 1, 3],
      ['c', 2, 3],
    ]);
    expect(clusters).toEqual([{ column: 1, laneCount: 3, eventIds: ['a', 'b', 'c'] }]);
  });

  it('keeps separate clusters with their own lane counts', () => {
    const out = lanes([
      ev('a', '2027-05-01', '2027-05-02'),
      ev('b', '2027-05-02', '2027-05-03'),
      ev('c', '2027-05-10', '2027-05-12'),
    ]);
    expect(out.map((s) => [s.id, s.lane, s.n])).toEqual([
      ['a', 0, 2],
      ['b', 1, 2],
      ['c', 0, 1],
    ]);
  });

  it('lays out columns independently across a month boundary', () => {
    const out = lanes([ev('x', '2027-03-30', '2027-04-02'), ev('y', '2027-04-01', '2027-04-03')]);
    expect(out).toEqual([
      { id: 'x', col: 2, days: [30, 31], lane: 0, n: 1, primary: true },
      // Same start: the longer segment (y) comes first and takes lane 0.
      { id: 'y', col: 3, days: [1, 3], lane: 0, n: 2, primary: true },
      { id: 'x', col: 3, days: [1, 2], lane: 1, n: 2, primary: false },
    ]);
  });

  it('breaks ties between identical segments by id', () => {
    const out = lanes([ev('b', '2027-09-01', '2027-09-02'), ev('a', '2027-09-01', '2027-09-02')]);
    expect(out.map((s) => s.id)).toEqual(['a', 'b']);
  });
});
