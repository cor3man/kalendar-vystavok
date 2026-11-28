import { useId, useState } from 'react';
import {
  CUSTOM_HUE_MAX,
  CUSTOM_LIGHTNESS_MAX,
  CUSTOM_LIGHTNESS_MIN,
  customColor,
  normalizeHex,
  sliderPosition,
} from '../../domain/color.ts';
import { ru } from '../../i18n/ru.ts';
import form from '../common/form.module.css';
import styles from './dialogs.module.css';

interface CustomColorSlidersProps {
  /** The current colour; the sliders start at its nearest position. */
  initial: string;
  onChange: (hex: string) => void;
}

const FALLBACK = { hue: 0, l: 85 };

/** «Другой цвет…» (SPEC 5.4): hue and lightness sliders limited to light colours. */
export function CustomColorSliders({ initial, onChange }: CustomColorSlidersProps) {
  const hueId = useId();
  const lightId = useId();
  const [pos, setPos] = useState(() => {
    const hex = normalizeHex(initial);
    return hex === null ? FALLBACK : sliderPosition(hex);
  });
  const hex = customColor(pos.hue, pos.l);

  function update(next: { hue: number; l: number }) {
    setPos(next);
    onChange(customColor(next.hue, next.l));
  }

  return (
    <div className={styles.sliders} data-testid="custom-color">
      <label className={form.field} htmlFor={hueId}>
        <span className={form.label}>{ru.colorPicker.hue}</span>
        <input
          id={hueId}
          type="range"
          min={0}
          max={CUSTOM_HUE_MAX}
          step={1}
          value={pos.hue}
          className={styles.hueSlider}
          onChange={(e) => {
            update({ ...pos, hue: e.currentTarget.valueAsNumber });
          }}
        />
      </label>
      <label className={form.field} htmlFor={lightId}>
        <span className={form.label}>{ru.colorPicker.lightness}</span>
        <input
          id={lightId}
          type="range"
          min={CUSTOM_LIGHTNESS_MIN}
          max={CUSTOM_LIGHTNESS_MAX}
          step={1}
          value={pos.l}
          onChange={(e) => {
            update({ ...pos, l: e.currentTarget.valueAsNumber });
          }}
        />
      </label>
      <span
        className={styles.sliderPreview}
        style={{ background: hex }}
        role="img"
        aria-label={`${ru.colorPicker.preview} ${hex}`}
        data-testid="custom-color-preview"
        data-color={hex}
      />
    </div>
  );
}
