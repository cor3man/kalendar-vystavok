import { useId } from 'react';
import { isDarkColor, normalizeHex } from '../../domain/color.ts';
import { PALETTE } from '../../domain/palette.ts';
import { ru } from '../../i18n/ru.ts';
import form from '../common/form.module.css';
import styles from './dialogs.module.css';

interface ColorPickerProps {
  label: string;
  value: string;
  onChange: (hex: string) => void;
}

/** 10 palette swatches plus a custom colour (SPEC 5.4, Appendix C). */
export function ColorPicker({ label, value, onChange }: ColorPickerProps) {
  const labelId = useId();
  const current = normalizeHex(value) ?? value;
  const inPalette = PALETTE.some((p) => p.hex === current);
  const dark = !inPalette && normalizeHex(current) !== null && isDarkColor(current);
  return (
    <div className={form.field}>
      <span id={labelId} className={form.label}>
        {label}
      </span>
      <div className={styles.swatches} role="radiogroup" aria-labelledby={labelId}>
        {PALETTE.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={p.hex === current}
            aria-label={ru.palette[p.id]}
            title={ru.palette[p.id]}
            className={styles.swatchButton}
            style={{ background: p.hex }}
            onClick={() => {
              onChange(p.hex);
            }}
          />
        ))}
        <label className={styles.customColor}>
          <input
            type="color"
            value={current.toLowerCase()}
            aria-label={ru.eventDialog.customColor}
            onChange={(e) => {
              onChange(e.currentTarget.value.toUpperCase());
            }}
          />
          <span>{ru.eventDialog.customColor}</span>
        </label>
      </div>
      {dark && (
        <p className={form.warning} role="status">
          {ru.eventDialog.darkColor}
        </p>
      )}
    </div>
  );
}
