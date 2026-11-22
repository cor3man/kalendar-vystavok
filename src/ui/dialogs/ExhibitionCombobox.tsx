import { useId, useState, type KeyboardEvent } from 'react';
import type { Exhibition } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import form from '../common/form.module.css';
import styles from './dialogs.module.css';

interface ExhibitionComboboxProps {
  exhibitions: readonly Exhibition[];
  query: string;
  /** The picked exhibition's name equals the query; shown as chosen. */
  onQuery: (text: string) => void;
  onPick: (exhibition: Exhibition) => void;
  onCreate: (name: string) => void;
  invalid: boolean;
  autoFocus?: boolean;
}

type Option = { kind: 'exhibition'; exhibition: Exhibition } | { kind: 'create'; name: string };

function fold(text: string): string {
  return text.trim().toLocaleLowerCase('ru');
}

/** Options for a query: matching exhibitions, then "Создать выставку «…»" for a new name. */
function exhibitionOptions(exhibitions: readonly Exhibition[], query: string): Option[] {
  const q = fold(query);
  const matches = exhibitions
    .filter((x) => q === '' || fold(x.name).includes(q) || fold(x.shortName).includes(q))
    .sort((a, b) => a.name.localeCompare(b.name, 'ru'))
    .map((exhibition): Option => ({ kind: 'exhibition', exhibition }));
  const exact = exhibitions.some((x) => fold(x.name) === q);
  return q === '' || exact ? matches : [...matches, { kind: 'create', name: query.trim() }];
}

/** Exhibition combobox over the catalogue with type-to-search (SPEC 5.4). */
export function ExhibitionCombobox({
  exhibitions,
  query,
  onQuery,
  onPick,
  onCreate,
  invalid,
  autoFocus = false,
}: ExhibitionComboboxProps) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const options = exhibitionOptions(exhibitions, query);

  function choose(option: Option | undefined) {
    if (option === undefined) return;
    if (option.kind === 'exhibition') onPick(option.exhibition);
    else onCreate(option.name);
    setOpen(false);
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!open) {
        setOpen(true);
        setActive(0);
        return;
      }
      const step = e.key === 'ArrowDown' ? 1 : -1;
      setActive(Math.min(options.length - 1, Math.max(0, active + step)));
    } else if (e.key === 'Enter' && open && options.length > 0) {
      // Pick the option instead of submitting the form.
      e.preventDefault();
      choose(options[active]);
    } else if (e.key === 'Escape' && open) {
      e.preventDefault();
      e.stopPropagation();
      setOpen(false);
    }
  }

  return (
    <div className={form.field}>
      <label className={form.label} htmlFor={`${id}-input`}>
        {ru.eventDialog.exhibition}
      </label>
      <div className={styles.combo}>
        <input
          id={`${id}-input`}
          className={form.input}
          type="text"
          role="combobox"
          autoComplete="off"
          autoFocus={autoFocus}
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={`${id}-list`}
          aria-invalid={invalid}
          aria-activedescendant={open && options.length > 0 ? `${id}-${String(active)}` : undefined}
          placeholder={ru.eventDialog.exhibitionPlaceholder}
          value={query}
          onChange={(e) => {
            onQuery(e.currentTarget.value);
            setActive(0);
            setOpen(true);
          }}
          onClick={() => {
            setOpen(true);
          }}
          onBlur={() => {
            setOpen(false);
          }}
          onKeyDown={onKeyDown}
        />
        {open && (
          <ul id={`${id}-list`} role="listbox" className={styles.listbox}>
            {options.length === 0 && (
              <li className={styles.optionEmpty}>{ru.eventDialog.noMatches}</li>
            )}
            {options.map((o, i) => (
              <li
                key={o.kind === 'exhibition' ? o.exhibition.id : '\u0000create'}
                id={`${id}-${String(i)}`}
                role="option"
                aria-selected={i === active}
                className={
                  o.kind === 'create'
                    ? [styles.option, styles.optionCreate].join(' ')
                    : styles.option
                }
                onMouseDown={(e) => {
                  e.preventDefault();
                }}
                onClick={() => {
                  choose(o);
                }}
              >
                {o.kind === 'exhibition' ? (
                  <>
                    <span
                      className={form.swatch}
                      style={{ background: o.exhibition.defaultColor }}
                    />
                    {o.exhibition.name}
                  </>
                ) : (
                  ru.eventDialog.createExhibition(o.name)
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
