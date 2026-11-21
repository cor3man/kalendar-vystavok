import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { formatDateRange } from '../../domain/dateText.ts';
import { normalizeRange } from '../../domain/editing.ts';
import type { Id, ISODate } from '../../domain/types.ts';
import { eventAt, rangeRects } from '../../layout/hitTest.ts';
import { dayAt } from '../../layout/layout.ts';
import { COLORS } from '../../layout/pageSpec.ts';
import type { LayoutResult } from '../../layout/shapes.ts';
import styles from './CalendarPreview.module.css';

interface Drag {
  pointerId: number;
  anchor: ISODate;
  current: ISODate;
  /** The pointer reached another day: this is a range selection, not a click. */
  moved: boolean;
  /** Event under the press, for a click (SPEC 5.3). */
  eventId: Id | null;
  /** Tooltip position in px relative to the page. */
  tip: { x: number; y: number };
}

interface SelectionLayerProps {
  layout: LayoutResult;
  enabled: boolean;
  onCreate: (start: ISODate, end: ISODate) => void;
  onEdit: (eventId: Id) => void;
}

/** Highlight stroke width in mm. */
const OUTLINE = 0.5;
const TIP_OFFSET_PX = 14;

/**
 * Transparent layer over the preview with the same viewBox (SPEC 5.3): press, drag and release
 * selects days; a click opens an event. Pointer positions are mapped to page millimetres with the
 * SVG's current screen matrix, so selection stays correct after scrolling and resizing.
 * The highlight is UI only and never part of the LayoutResult, so it is never printed.
 */
export function SelectionLayer({ layout, enabled, onCreate, onEdit }: SelectionLayerProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [cursor, setCursor] = useState<'cell' | 'pointer' | 'default'>('default');
  const { page, grid, hits } = layout;

  function toPage(e: PointerEvent): { x: number; y: number; tip: Drag['tip'] } | null {
    const svg = ref.current;
    const ctm = svg?.getScreenCTM();
    if (svg === null || ctm === null || ctm === undefined) return null;
    const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(ctm.inverse());
    const box = svg.getBoundingClientRect();
    return { x: p.x, y: p.y, tip: { x: e.clientX - box.left, y: e.clientY - box.top } };
  }

  useEffect(() => {
    if (drag === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setDrag(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [drag]);

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (!enabled || e.button !== 0) return;
    const p = toPage(e);
    const day = p === null ? null : dayAt(grid, p.x, p.y);
    if (p === null || day === null) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDrag({
      pointerId: e.pointerId,
      anchor: day,
      current: day,
      moved: false,
      eventId: eventAt(hits, p.x, p.y),
      tip: p.tip,
    });
  }

  function onPointerMove(e: PointerEvent<SVGSVGElement>) {
    const p = toPage(e);
    if (p === null) return;
    if (drag?.pointerId !== e.pointerId) {
      if (!enabled) return;
      const next =
        eventAt(hits, p.x, p.y) !== null
          ? 'pointer'
          : dayAt(grid, p.x, p.y) !== null
            ? 'cell'
            : 'default';
      if (next !== cursor) setCursor(next);
      return;
    }
    const day = dayAt(grid, p.x, p.y) ?? drag.current;
    setDrag({ ...drag, current: day, moved: drag.moved || day !== drag.anchor, tip: p.tip });
  }

  function onPointerUp(e: PointerEvent<SVGSVGElement>) {
    if (drag?.pointerId !== e.pointerId) return;
    setDrag(null);
    if (!drag.moved && drag.eventId !== null) {
      onEdit(drag.eventId);
      return;
    }
    const { start, end } = normalizeRange(drag.anchor, drag.current);
    onCreate(start, end);
  }

  const range = drag === null ? null : normalizeRange(drag.anchor, drag.current);
  const showRange = drag !== null && (drag.moved || drag.eventId === null);

  return (
    <>
      <svg
        ref={ref}
        className={styles.selection}
        viewBox={`0 0 ${String(page.w)} ${String(page.h)}`}
        style={{ cursor }}
        data-testid="selection-layer"
        aria-hidden="true"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={() => {
          setDrag(null);
        }}
      >
        {showRange &&
          range !== null &&
          rangeRects(grid, range.start, range.end).map((r, i) => (
            <rect
              key={i}
              data-testid="selection-highlight"
              x={r.x}
              y={r.y}
              width={r.w}
              height={r.h}
              fill={COLORS.magenta}
              fillOpacity={0.18}
              stroke={COLORS.magenta}
              strokeWidth={OUTLINE}
            />
          ))}
      </svg>
      {showRange && range !== null && (
        <div
          className={styles.tooltip}
          role="status"
          data-testid="selection-tooltip"
          style={{ left: drag.tip.x + TIP_OFFSET_PX, top: drag.tip.y + TIP_OFFSET_PX }}
        >
          {formatDateRange(range.start, range.end)}
        </div>
      )}
    </>
  );
}
