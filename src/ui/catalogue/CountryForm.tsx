import { useId, useState, type SyntheticEvent } from 'react';
import type { CountryDraft } from '../../domain/editing.ts';
import type { Country } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import { useStoreApi } from '../../state/storeContext.ts';
import controls from '../common/controls.module.css';
import { Dialog } from '../common/Dialog.tsx';
import { editErrorText } from '../common/editErrorText.ts';
import form from '../common/form.module.css';
import { FLAG_LIMIT } from '../common/imageImport.ts';
import { ImageField } from './ImageField.tsx';

interface CountryFormProps {
  /** null: a new country. */
  country: Country | null;
  onClose: () => void;
}

/** Add / edit a country with its flag (SPEC 5.5). */
export function CountryForm({ country, onClose }: CountryFormProps) {
  const store = useStoreApi();
  const formId = useId();
  const [draft, setDraft] = useState<CountryDraft>(country ?? { name: '', flag: null });
  const [error, setError] = useState<string | null>(null);

  function onSubmit(e: SyntheticEvent) {
    e.preventDefault();
    const outcome = store.getState().saveCountry(country?.id ?? null, draft);
    if (outcome.ok) onClose();
    else setError(editErrorText(outcome.error));
  }

  return (
    <Dialog
      title={country === null ? ru.catalogue.newCountry : ru.catalogue.editCountry}
      testId="country-form"
      onClose={onClose}
      actions={
        <>
          <button type="button" className={controls.button} onClick={onClose}>
            {ru.common.cancel}
          </button>
          <button
            type="submit"
            form={formId}
            className={[controls.button, controls.primary].join(' ')}
          >
            {ru.common.save}
          </button>
        </>
      }
    >
      <form id={formId} className={form.form} onSubmit={onSubmit} noValidate>
        <label className={form.field}>
          <span className={form.label}>{ru.catalogue.name}</span>
          <input
            className={form.input}
            type="text"
            value={draft.name}
            onChange={(e) => {
              setDraft({ ...draft, name: e.currentTarget.value });
              setError(null);
            }}
          />
        </label>
        <ImageField
          label={ru.catalogue.flag}
          value={draft.flag}
          limit={FLAG_LIMIT}
          testId="flag-file"
          onChange={(flag) => {
            setDraft({ ...draft, flag });
          }}
        />
        {error !== null && (
          <p className={form.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
