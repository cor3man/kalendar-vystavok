import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { formatDateRange } from '../../domain/dateText.ts';
import { normalizeRange } from '../../domain/editing.ts';
import type { Id, ISODate, SelectionMode } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import { eventAt, rangeRects } from '../../layout/hitTest.ts';
import { dayAt } from '../../layout/layout.ts';
import { COLORS } from '../../layout/pageSpec.ts';
import type { LayoutResult } from '../../layout/shapes.ts';
import styles from './CalendarPreview.module.css';
import { clickShift } from './clickShift.ts';

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

/** The marked first day of the click-shift mode, with its tooltip position. */
interface Mark {
  day: ISODate;
  tip: { x: number; y: number };
}

interface SelectionLayerProps {
  layout: LayoutResult;
  /** False while read-only or while a dialog is open; also clears a marked first day. */
  enabled: boolean;
  mode: SelectionMode;
  onCreate: (start: ISODate, end: ISODate) => void;
  onEdit: (eventId: Id) => void;
}

/** Highlight stroke width in mm. */
const OUTLINE = 0.5;
const TIP_OFFSET_PX = 14;

/**
 * Transparent layer over the preview with the same viewBox (SPEC 5.3). `click-shift`: a click
 * marks the first day, Shift+click the last; `drag`: press, drag and release selects days. In both
 * modes a click opens an event. Pointer positions are mapped to page millimetres with the
 * SVG's current screen matrix, so selection stays correct after scrolling and resizing.
 * The highlight is UI only and never part of the LayoutResult, so it is never printed.
 */
export function SelectionLayer({ layout, enabled, mode, onCreate, onEdit }: SelectionLayerProps) {
  const ref = useRef<SVGSVGElement>(null);
  const [drag, setDrag] = useState<Drag | null>(null);
  const [mark, setMark] = useState<Mark | null>(null);
  // A dialog opening (or read-only, or the drag mode) clears the mark (SPEC 5.3).
  if (mark !== null && (!enabled || mode !== 'click-shift')) setMark(null);
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

  const active = drag !== null || mark !== null;
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        setDrag(null);
        setMark(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [active]);

  function onPointerDown(e: PointerEvent<SVGSVGElement>) {
    if (!enabled || e.button !== 0) return;
    const p = toPage(e);
    const day = p === null ? null : dayAt(grid, p.x, p.y);
    if (p === null || day === null) return;
    // preventDefault stops text selection during the drag, but also keeps the focus where it was
    // (e.g. on an event-list button far below). Drop it, as a normal click on the page would, so a
    // dialog opened from here does not hand the focus back to that element when it closes.
    e.preventDefault();
    if (document.activeElement instanceof HTMLElement) document.activeElement.blur();
    if (mode === 'click-shift') {
      const result = clickShift(mark?.day ?? null, {
        day,
        eventId: eventAt(hits, p.x, p.y),
        shift: e.shiftKey,
      });
      setMark(result.start === null ? null : { day: result.start, tip: p.tip });
      if (result.action.kind === 'create') onCreate(result.action.start, result.action.end);
      if (result.action.kind === 'edit') onEdit(result.action.eventId);
      return;
    }
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

  const dragRange = drag === null ? null : normalizeRange(drag.anchor, drag.current);
  const showDrag = drag !== null && (drag.moved || drag.eventId === null);
  const range = showDrag ? dragRange : mark === null ? null : { start: mark.day, end: mark.day };

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
        {range !== null &&
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
      {showDrag && dragRange !== null && (
        <div
          className={styles.tooltip}
          role="status"
          data-testid="selection-tooltip"
          style={{ left: drag.tip.x + TIP_OFFSET_PX, top: drag.tip.y + TIP_OFFSET_PX }}
        >
          {formatDateRange(dragRange.start, dragRange.end)}
        </div>
      )}
      {mark !== null && !showDrag && (
        <div
          className={styles.tooltip}
          role="status"
          data-testid="selection-tooltip"
          style={{ left: mark.tip.x + TIP_OFFSET_PX, top: mark.tip.y + TIP_OFFSET_PX }}
        >
          {ru.selection.shiftHint}
        </div>
      )}
    </>
  );
}
