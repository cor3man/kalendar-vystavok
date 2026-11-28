import { useId, useState } from 'react';
import { isDarkColor, normalizeHex } from '../../domain/color.ts';
import { COLOR_HUES, GRID_CELLS, gridCellOf } from '../../domain/colorGrid.ts';
import { ru } from '../../i18n/ru.ts';
import { useCalendarStore } from '../../state/storeContext.ts';
import form from '../common/form.module.css';
import { CustomColorSliders } from './CustomColorSliders.tsx';
import styles from './dialogs.module.css';
import { SwatchGroup, type Swatch } from './SwatchGroup.tsx';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

const EMPTY: readonly string[] = [];

/** Name of a colour: its grid cell, or the hex for other colours. */
function colorLabel(hex: string): string {
  const cell = gridCellOf(hex);
  return cell === null ? hex : ru.colorPicker.cell(ru.colorHues[cell.hue], cell.tint);
}

const GRID_SWATCHES: readonly Swatch[] = GRID_CELLS.map((c) => ({
  hex: c.hex,
  label: colorLabel(c.hex),
}));

/**
 * Word-style colour picker (SPEC 5.4, Appendix C): 40 light shades, the recent colours and
 * «Другой цвет…» with sliders limited to light colours.
 */
export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const labelId = useId();
  const recentId = useId();
  const moreId = useId();
  const recent = useCalendarStore((s) => s.data?.settings.recentColors ?? EMPTY);
  const current = normalizeHex(value) ?? value;
  const known = gridCellOf(current) !== null || recent.includes(current);
  // A colour that is neither in the grid nor recent opens the sliders at its position (5.4).
  const [moreOpen, setMoreOpen] = useState(!known);
  const dark = normalizeHex(current) !== null && isDarkColor(current);

  return (
    <div className={form.field}>
      <span id={labelId} className={form.label}>
        {label}
      </span>
      <SwatchGroup
        swatches={GRID_SWATCHES}
        columns={COLOR_HUES.length}
        value={current}
        onPick={onChange}
        labelledBy={labelId}
        testId="color-grid"
      />
      {recent.length > 0 && (
        <>
          <span id={recentId} className={form.label}>
            {ru.colorPicker.recent}
          </span>
          <SwatchGroup
            swatches={recent.map((hex) => ({ hex, label: colorLabel(hex) }))}
            columns={recent.length}
            value={current}
            onPick={onChange}
            labelledBy={recentId}
            testId="color-recent"
          />
        </>
      )}
      <button
        type="button"
        className={styles.moreButton}
        aria-expanded={moreOpen}
        aria-controls={moreId}
        onClick={() => {
          setMoreOpen(!moreOpen);
        }}
      >
        {ru.colorPicker.more}
      </button>
      <div id={moreId} hidden={!moreOpen}>
        {moreOpen && <CustomColorSliders initial={current} onChange={onChange} />}
      </div>
      {dark && (
        <p className={form.warning} role="status">
          {ru.eventDialog.darkColor}
        </p>
      )}
    </div>
  );
}
