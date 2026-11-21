// Hit-testing on a LayoutResult for the preview's pointer handling (SPEC 5.3).
import type { Id } from '../domain/types.ts';
import type { EventHit } from './shapes.ts';

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
