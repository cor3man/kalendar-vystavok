import { useId, useRef, useState, type KeyboardEvent } from 'react';
import type { Country, Id } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import form from '../common/form.module.css';
import styles from './dialogs.module.css';

interface CountrySelectProps {
  label: string;
  countries: readonly Country[];
  value: Id | null;
  onChange: (id: Id | null) => void;
}

function Flag({ country }: { country: Country | undefined }) {
  return country !== undefined && country.flag !== null ? (
    <img className={styles.flag} src={country.flag.dataUrl} alt="" />
  ) : (
    <span className={styles.flagPlaceholder} />
  );
}

/**
 * Select with flag thumbnails (SPEC 5.4): a select-only combobox, since a native <select>
 * cannot show images. Arrow keys, Home / End, Enter and Esc work as in a native select.
 */
export function CountrySelect({ label, countries, value, onChange }: CountrySelectProps) {
  const id = useId();
  const button = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const sorted = [...countries].sort((a, b) => a.name.localeCompare(b.name, 'ru'));
  const options: (Country | null)[] = [null, ...sorted];
  const selectedIndex = Math.max(
    0,
    options.findIndex((c) => (c?.id ?? null) === value),
  );
  const [active, setActive] = useState(selectedIndex);
  const selected = options[selectedIndex] ?? null;

  function choose(index: number) {
    const c = options[index];
    if (c === undefined) return;
    onChange(c?.id ?? null);
    setOpen(false);
    button.current?.focus();
  }

  function onKeyDown(e: KeyboardEvent) {
    const last = options.length - 1;
    const moves: Record<string, number> = {
      ArrowDown: Math.min(last, active + 1),
      ArrowUp: Math.max(0, active - 1),
      Home: 0,
      End: last,
    };
    const move = moves[e.key];
    if (move !== undefined) {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(selectedIndex);
      } else setActive(move);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (open) choose(active);
      else {
        setActive(selectedIndex);
        setOpen(true);
      }
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    } else if (e.key === 'Tab' && open) {
      setOpen(false);
    }
  }

  return (
    <div className={form.field}>
      <span id={`${id}-label`} className={form.label}>
        {label}
      </span>
      <div className={styles.combo}>
        <button
          ref={button}
          type="button"
          role="combobox"
          aria-labelledby={`${id}-label`}
          aria-haspopup="listbox"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-activedescendant={open ? `${id}-${String(active)}` : undefined}
          className={[form.input, styles.selectButton].join(' ')}
          onClick={() => {
            setActive(selectedIndex);
            setOpen(!open);
          }}
          onKeyDown={onKeyDown}
          onBlur={() => {
            setOpen(false);
          }}
        >
          <Flag country={selected ?? undefined} />
          <span>{selected?.name ?? ru.eventDialog.noCountry}</span>
        </button>
        {open && (
          <ul
            id={`${id}-list`}
            role="listbox"
            className={styles.listbox}
            aria-labelledby={`${id}-label`}
          >
            {options.map((c, i) => (
              <li
                key={c?.id ?? ''}
                id={`${id}-${String(i)}`}
                role="option"
                aria-selected={i === active}
                className={styles.option}
                onMouseDown={(e) => {
                  // Keep the focus on the button so onBlur does not close before the click.
                  e.preventDefault();
                }}
                onClick={() => {
                  choose(i);
                }}
              >
                <Flag country={c ?? undefined} />
                {c?.name ?? ru.eventDialog.noCountry}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
