import { useRef, useState, type KeyboardEvent } from 'react';
import styles from './dialogs.module.css';

export interface Swatch {
  hex: string;
  label: string;
}

interface SwatchGroupProps {
  swatches: readonly Swatch[];
  /** Cells per row; arrow keys move within this grid. */
  columns: number;
  /** Selected colour ('#RRGGBB', upper case), or a value matching none. */
  value: string;
  onPick: (hex: string) => void;
  labelledBy: string;
  testId?: string;
}

/**
 * Radio group of colour swatches (SPEC 5.4): one tab stop; arrow keys, Home and End move the
 * focus between cells; Enter or Space (the button's click) picks the focused colour.
 */
export function SwatchGroup({
  swatches,
  columns,
  value,
  onPick,
  labelledBy,
  testId,
}: SwatchGroupProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const selected = swatches.findIndex((s) => s.hex === value);
  const [focused, setFocused] = useState<number | null>(null);
  const tabStop = focused ?? (selected >= 0 ? selected : 0);

  function move(e: KeyboardEvent, from: number) {
    const last = swatches.length - 1;
    const step: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
    };
    let to: number | null = null;
    if (e.key in step) to = from + (step[e.key] ?? 0);
    else if (e.key === 'Home') to = 0;
    else if (e.key === 'End') to = last;
    if (to === null) return;
    e.preventDefault();
    const next = Math.min(last, Math.max(0, to));
    setFocused(next);
    refs.current[next]?.focus();
  }

  return (
    <div
      className={styles.swatchGrid}
      style={{ gridTemplateColumns: `repeat(${String(columns)}, 1.75rem)` }}
      role="radiogroup"
      aria-labelledby={labelledBy}
      data-testid={testId}
    >
      {swatches.map((s, i) => (
        <button
          key={s.hex}
          ref={(el) => {
            refs.current[i] = el;
          }}
          type="button"
          role="radio"
          aria-checked={s.hex === value}
          aria-label={s.label}
          title={s.label}
          tabIndex={i === tabStop ? 0 : -1}
          className={styles.swatchButton}
          style={{ background: s.hex }}
          onFocus={() => {
            setFocused(i);
          }}
          onKeyDown={(e) => {
            move(e, i);
          }}
          onClick={() => {
            onPick(s.hex);
          }}
        />
      ))}
    </div>
  );
}
