import type { Id, ISODate, SelectionMode } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import type { LayoutResult } from '../../layout/shapes.ts';
import { CalendarSvg } from '../../render/svg/CalendarSvg.tsx';
import styles from './CalendarPreview.module.css';
import { SelectionLayer } from './SelectionLayer.tsx';

interface CalendarPreviewProps {
  layout: LayoutResult | null;
  /** False when read-only: the preview can be looked at and printed only. */
  editable: boolean;
  /** A dialog is open: day selection pauses and a marked first day is cleared (SPEC 5.3). */
  paused: boolean;
  mode: SelectionMode;
  onCreate: (start: ISODate, end: ISODate) => void;
  onEdit: (eventId: Id) => void;
}

/** The page exactly as printed (SPEC 5.2), with day selection on top (5.3). */
export function CalendarPreview({
  layout,
  editable,
  paused,
  mode,
  onCreate,
  onEdit,
}: CalendarPreviewProps) {
  return (
    <section className={styles.scroller} aria-label={ru.preview.label}>
      {layout === null ? (
        <p className={styles.loading}>{ru.preview.loading}</p>
      ) : (
        <>
          <div
            className={styles.page}
            data-testid="calendar-preview"
            data-format={layout.page.formatId}
          >
            <CalendarSvg layout={layout} title={`${ru.preview.label} ${layout.page.title}`} />
            {/* A new year or format remounts the layer, which clears a marked day (SPEC 5.3). */}
            <SelectionLayer
              key={`${layout.page.formatId}:${layout.page.title}`}
              layout={layout}
              enabled={editable && !paused}
              mode={mode}
              onCreate={onCreate}
              onEdit={onEdit}
            />
          </div>
          {editable && (
            <p className={styles.hint}>
              {mode === 'click-shift' ? ru.selection.hintClickShift : ru.selection.hint}
            </p>
          )}
        </>
      )}
    </section>
  );
}
