// Hit-testing on a LayoutResult for the preview's pointer handling (SPEC 5.3).
import { normalizeRange } from '../domain/editing.ts';
import { splitEvent } from '../domain/segments.ts';
import type { Id, ISODate } from '../domain/types.ts';
import type { EventHit, GridGeometry, Rect } from './shapes.ts';

/** Rectangles covering the days of a range on the grid, one per month column it touches. */
export function rangeRects(grid: GridGeometry, a: ISODate, b: ISODate): Rect[] {
  const range = normalizeRange(a, b);
  return splitEvent({ id: '', ...range }, grid.months).map((s) => ({
    x: grid.x + s.column * grid.colW,
    y: grid.y + (s.startDay - 1) * grid.rowH,
    w: grid.colW,
    h: (s.endDay - s.startDay + 1) * grid.rowH,
  }));
}

/** The event drawn under a page point (mm), or null. Later hits are drawn on top. */
export function eventAt(hits: readonly EventHit[], x: number, y: number): Id | null {
  for (let i = hits.length - 1; i >= 0; i--) {
    const h = hits[i];
    if (h !== undefined && x >= h.x && x < h.x + h.w && y >= h.y && y < h.y + h.h) {
      return h.eventId;
    }
  }
  return null;
}
