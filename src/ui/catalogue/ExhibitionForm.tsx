import { useId, useState, type SyntheticEvent } from 'react';
import type { ExhibitionDraft } from '../../domain/editing.ts';
import { PALETTE } from '../../domain/palette.ts';
import type { DataFile, Exhibition } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import { useStoreApi } from '../../state/storeContext.ts';
import controls from '../common/controls.module.css';
import { Dialog } from '../common/Dialog.tsx';
import { editErrorText } from '../common/editErrorText.ts';
import form from '../common/form.module.css';
import { LOGO_LIMIT } from '../common/imageImport.ts';
import { ColorPicker } from '../dialogs/ColorPicker.tsx';
import { CountrySelect } from '../dialogs/CountrySelect.tsx';
import { ImageField } from './ImageField.tsx';
import { ShortNamePreview } from './ShortNamePreview.tsx';

interface ExhibitionFormProps {
  data: DataFile;
  /** null: a new exhibition. */
  exhibition: Exhibition | null;
  onClose: () => void;
}

const EMPTY: ExhibitionDraft = {
  name: '',
  shortName: '',
  logo: null,
  defaultCity: '',
  defaultCountryId: null,
  defaultColor: PALETTE[0].hex,
};

/** Add / edit a catalogue exhibition (SPEC 5.5). */
export function ExhibitionForm({ data, exhibition, onClose }: ExhibitionFormProps) {
  const store = useStoreApi();
  const formId = useId();
  const [draft, setDraft] = useState<ExhibitionDraft>(exhibition ?? EMPTY);
  const [error, setError] = useState<string | null>(null);

  function patch(p: Partial<ExhibitionDraft>) {
    setDraft({ ...draft, ...p });
    setError(null);
  }

  function onSubmit(e: SyntheticEvent) {
    e.preventDefault();
    const outcome = store.getState().saveExhibition(exhibition?.id ?? null, draft);
    if (outcome.ok) onClose();
    else setError(editErrorText(outcome.error));
  }

  const country = data.countries.find((c) => c.id === draft.defaultCountryId);
  return (
    <Dialog
      title={exhibition === null ? ru.catalogue.newExhibition : ru.catalogue.editExhibition}
      testId="exhibition-form"
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
              patch({ name: e.currentTarget.value });
            }}
          />
        </label>
        <div className={form.row}>
          <label className={form.field}>
            <span className={form.label}>{ru.catalogue.shortName}</span>
            <textarea
              className={form.input}
              rows={4}
              value={draft.shortName}
              placeholder={draft.name}
              onChange={(e) => {
                patch({ shortName: e.currentTarget.value });
              }}
            />
            <span className={controls.hint}>{ru.catalogue.shortNameHint}</span>
          </label>
          <ShortNamePreview
            shortName={draft.shortName.trim() === '' ? draft.name : draft.shortName}
            city={draft.defaultCity}
            flag={country?.flag ?? null}
            logo={draft.logo}
            color={draft.defaultColor}
          />
        </div>
        <ImageField
          label={ru.catalogue.logo}
          value={draft.logo}
          limit={LOGO_LIMIT}
          testId="logo-file"
          onChange={(logo) => {
            patch({ logo });
          }}
        />
        <div className={form.row}>
          <label className={form.field}>
            <span className={form.label}>{ru.catalogue.defaultCity}</span>
            <input
              className={form.input}
              type="text"
              value={draft.defaultCity}
              onChange={(e) => {
                patch({ defaultCity: e.currentTarget.value });
              }}
            />
          </label>
          <CountrySelect
            label={ru.catalogue.defaultCountry}
            countries={data.countries}
            value={draft.defaultCountryId}
            onChange={(defaultCountryId) => {
              patch({ defaultCountryId });
            }}
          />
        </div>
        <ColorPicker
          label={ru.catalogue.defaultColor}
          value={draft.defaultColor}
          onChange={(defaultColor) => {
            patch({ defaultColor });
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
