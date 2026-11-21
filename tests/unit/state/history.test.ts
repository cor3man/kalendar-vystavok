import { describe, expect, it } from 'vitest';
import {
  EMPTY_HISTORY,
  HISTORY_LIMIT,
  record,
  redoStep,
  undoStep,
  type Snapshot,
} from '../../../src/state/history.ts';
import { createIdGenerator, ID_LENGTH } from '../../../src/state/ids.ts';

function snap(n: number): Snapshot {
  return { countries: [], exhibitions: [], events: [], holidays: [{ date: String(n), label: '' }] };
}

describe('history', () => {
  it('undoes and redoes in order', () => {
    let h = record(EMPTY_HISTORY, snap(0));
    h = record(h, snap(1));
    const u1 = undoStep(h, snap(2));
    expect(u1?.snapshot).toEqual(snap(1));
    const u2 = u1 && undoStep(u1.history, u1.snapshot);
    expect(u2?.snapshot).toEqual(snap(0));
    expect(u2 && undoStep(u2.history, u2.snapshot)).toBeNull();
    const r1 = u2 && redoStep(u2.history, u2.snapshot);
    expect(r1?.snapshot).toEqual(snap(1));
    const r2 = r1 && redoStep(r1.history, r1.snapshot);
    expect(r2?.snapshot).toEqual(snap(2));
    expect(r2 && redoStep(r2.history, r2.snapshot)).toBeNull();
  });

  it('keeps the last 20 steps and drops redo on a new change', () => {
    let h = EMPTY_HISTORY;
    for (let i = 0; i < 25; i++) h = record(h, snap(i));
    expect(h.past).toHaveLength(HISTORY_LIMIT);
    expect(h.past[0]).toEqual(snap(5));
    const u = undoStep(h, snap(25));
    expect(u?.history.future).toHaveLength(1);
    expect(u && record(u.history, snap(99)).future).toEqual([]);
  });
});

describe('ids', () => {
  it('makes 10-character ids from the random bytes', () => {
    const next = createIdGenerator((bytes) => bytes.fill(65));
    expect(next()).toBe('1'.repeat(ID_LENGTH));
    const real = createIdGenerator();
    expect(real()).toMatch(/^[0-9A-Za-z_-]{10}$/);
  });
});
