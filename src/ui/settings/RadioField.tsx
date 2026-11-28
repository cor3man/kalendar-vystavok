import { useId } from 'react';
import form from '../common/form.module.css';
import styles from './settings.module.css';

interface RadioFieldProps<T extends string> {
  legend: string;
  value: T;
  options: readonly { value: T; label: string }[];
  onChange: (value: T) => void;
}

/** A labelled group of native radio buttons (SPEC 5.10). */
export function RadioField<T extends string>({
  legend,
  value,
  options,
  onChange,
}: RadioFieldProps<T>) {
  const name = useId();
  return (
    <fieldset className={styles.fieldset}>
      <legend className={form.label}>{legend}</legend>
      {options.map((o) => (
        <label key={o.value} className={form.check}>
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={o.value === value}
            onChange={() => {
              onChange(o.value);
            }}
          />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
