import { useMemo } from 'react';
import { ru } from '../../i18n/ru.ts';
import {
  layoutShortNamePreview,
  type ShortNamePreviewInput,
} from '../../layout/shortNamePreview.ts';
import { CalendarSvg } from '../../render/svg/CalendarSvg.tsx';
import form from '../common/form.module.css';
import { useMeasurer } from '../common/useMeasurer.ts';
import styles from './catalogue.module.css';

/** Live preview of how the short name wraps in a 3-day cell (SPEC 5.5). */
export function ShortNamePreview(input: ShortNamePreviewInput) {
  const measurer = useMeasurer();
  const { shortName, city, flag, logo, color } = input;
  const layout = useMemo(
    () =>
      measurer === null
        ? null
        : layoutShortNamePreview({ shortName, city, flag, logo, color }, measurer),
    [measurer, shortName, city, flag, logo, color],
  );
  return (
    <div className={form.field}>
      <span className={form.label}>{ru.catalogue.preview}</span>
      <div className={styles.namePreview} data-testid="short-name-preview">
        {layout !== null && <CalendarSvg layout={layout} title={ru.catalogue.preview} />}
      </div>
    </div>
  );
}
