import { useEffect, useId, useState, type SyntheticEvent } from 'react';
import { copyToNextYear, type EventDraft } from '../../domain/editing.ts';
import { isValidISO } from '../../domain/dates.ts';
import { citySuggestions } from '../../domain/eventList.ts';
import { PALETTE } from '../../domain/palette.ts';
import type { DataFile, Exhibition, Id } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import { useCalendarStore, useStoreApi, useUiApi } from '../../state/storeContext.ts';
import type { EventRequest } from '../../state/uiStore.ts';
import controls from '../common/controls.module.css';
import { Dialog } from '../common/Dialog.tsx';
import { editErrorText } from '../common/editErrorText.ts';
import form from '../common/form.module.css';
import { ColorPicker } from './ColorPicker.tsx';
import { CountrySelect } from './CountrySelect.tsx';
import styles from './dialogs.module.css';
import { ExhibitionCombobox } from './ExhibitionCombobox.tsx';

interface FormState extends Omit<EventDraft, 'exhibitionId'> {
  exhibitionId: Id | null;
  /** "Создать выставку «…»" was chosen with this name. */
  newName: string | null;
  query: string;
}

function fromDraft(draft: EventDraft, data: DataFile): FormState {
  const exhibition = data.exhibitions.find((x) => x.id === draft.exhibitionId);
  return { ...draft, newName: null, query: exhibition?.name ?? '' };
}

/** Initial form values, or null when the event to edit no longer exists. */
function initialForm(request: EventRequest, data: DataFile): FormState | null {
  switch (request.kind) {
    case 'new':
      return {
        exhibitionId: null,
        newName: null,
        query: '',
        start: request.start,
        end: request.end,
        city: '',
        countryId: null,
        color: PALETTE[0].hex,
        held: false,
        note: '',
      };
    case 'copy':
      return fromDraft(request.draft, data);
    case 'edit': {
      const event = data.events.find((e) => e.id === request.id);
      return event === undefined ? null : fromDraft(event, data);
    }
  }
}

function sameName(a: string, b: string): boolean {
  return a.trim().toLocaleLowerCase('ru') === b.trim().toLocaleLowerCase('ru');
}

interface EventDialogProps {
  request: EventRequest;
  data: DataFile;
  onClose: () => void;
}

/** Add / edit one event (SPEC 5.4). */
export function EventDialog({ request, data, onClose }: EventDialogProps) {
  const store = useStoreApi();
  const ui = useUiApi();
  const formId = useId();
  const citiesId = useId();
  const [state, setState] = useState<FormState | null>(() => initialForm(request, data));
  const [error, setError] = useState<string | null>(null);
  const editingId = request.kind === 'edit' ? request.id : null;
  const exists = useCalendarStore(
    (s) => editingId === null || (s.data?.events.some((e) => e.id === editingId) ?? false),
  );

  // The event was removed meanwhile (e.g. undo in another dialog): nothing left to edit.
  useEffect(() => {
    if (state === null || !exists) onClose();
  }, [state, exists, onClose]);
  if (state === null) return null;
  const current = state;

  function patch(p: Partial<FormState>) {
    setState({ ...current, ...p });
    setError(null);
  }

  function pick(x: Exhibition) {
    patch({
      exhibitionId: x.id,
      newName: null,
      query: x.name,
      city: x.defaultCity,
      countryId: x.defaultCountryId,
      color: x.defaultColor,
    });
  }

  function onSubmit(e: SyntheticEvent) {
    e.preventDefault();
    let exhibitionId = current.exhibitionId;
    let newName = current.newName;
    if (exhibitionId === null && newName === null) {
      exhibitionId = data.exhibitions.find((x) => sameName(x.name, current.query))?.id ?? null;
    }
    if (newName !== null && !sameName(newName, current.query)) newName = null;
    if (exhibitionId === null && newName === null) {
      setError(ru.editErrors.exhibitionRequired);
      return;
    }
    if (!isValidISO(current.start) || !isValidISO(current.end)) {
      setError(ru.editErrors.dateRequired);
      return;
    }
    const draft: EventDraft = {
      // Ignored by the store when a new exhibition is created.
      exhibitionId: exhibitionId ?? '',
      start: current.start,
      end: current.end,
      city: current.city,
      countryId: current.countryId,
      color: current.color,
      held: current.held,
      note: current.note,
    };
    const outcome = store.getState().saveEvent({
      id: editingId,
      draft,
      ...(newName === null ? {} : { newExhibitionName: newName }),
    });
    if (!outcome.ok) {
      setError(editErrorText(outcome.error));
      return;
    }
    onClose();
  }

  function onDelete() {
    if (editingId === null) return;
    const outcome = store.getState().deleteEvent(editingId);
    if (!outcome.ok) {
      setError(editErrorText(outcome.error));
      return;
    }
    ui.getState().showToast({ editCount: store.getState().editCount });
    onClose();
  }

  function onCopy() {
    const event = data.events.find((ev) => ev.id === editingId);
    if (event !== undefined)
      ui.getState().openEvent({ kind: 'copy', draft: copyToNextYear(event) });
  }

  const title =
    request.kind === 'edit'
      ? ru.eventDialog.titleEdit
      : request.kind === 'copy'
        ? ru.eventDialog.titleCopy
        : ru.eventDialog.titleNew;

  return (
    <Dialog
      title={title}
      testId="event-dialog"
      wide={editingId !== null}
      onClose={onClose}
      actions={
        <div className={styles.dialogButtons}>
          {editingId !== null && (
            <>
              <button
                type="button"
                className={[controls.button, styles.danger].join(' ')}
                onClick={onDelete}
              >
                {ru.common.delete}
              </button>
              <button type="button" className={controls.button} onClick={onCopy}>
                {ru.eventDialog.copyNextYear}
              </button>
            </>
          )}
          <span className={form.spacer} />
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
        </div>
      }
    >
      <form id={formId} className={form.form} onSubmit={onSubmit} noValidate>
        {request.kind === 'copy' && <p className={controls.hint}>{ru.eventDialog.copyHint}</p>}
        <ExhibitionCombobox
          exhibitions={data.exhibitions}
          query={current.query}
          invalid={error === ru.editErrors.exhibitionRequired}
          autoFocus={request.kind === 'new'}
          onQuery={(query) => {
            patch({ query, exhibitionId: null, newName: null });
          }}
          onPick={pick}
          onCreate={(name) => {
            patch({ exhibitionId: null, newName: name, query: name });
          }}
        />
        <div className={form.row}>
          <label className={form.field}>
            <span className={form.label}>{ru.eventDialog.start}</span>
            <input
              className={form.input}
              type="date"
              required
              value={current.start}
              onChange={(e) => {
                patch({ start: e.currentTarget.value });
              }}
            />
          </label>
          <label className={form.field}>
            <span className={form.label}>{ru.eventDialog.end}</span>
            <input
              className={form.input}
              type="date"
              required
              value={current.end}
              onChange={(e) => {
                patch({ end: e.currentTarget.value });
              }}
            />
          </label>
        </div>
        <div className={form.row}>
          <label className={form.field}>
            <span className={form.label}>{ru.eventDialog.city}</span>
            <input
              className={form.input}
              type="text"
              list={citiesId}
              value={current.city}
              onChange={(e) => {
                patch({ city: e.currentTarget.value });
              }}
            />
            <datalist id={citiesId}>
              {citySuggestions(data.events).map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </label>
          <CountrySelect
            label={ru.eventDialog.country}
            countries={data.countries}
            value={current.countryId}
            onChange={(countryId) => {
              patch({ countryId });
            }}
          />
        </div>
        <ColorPicker
          label={ru.eventDialog.color}
          value={current.color}
          onChange={(color) => {
            patch({ color });
          }}
        />
        <label className={form.check}>
          <input
            type="checkbox"
            checked={current.held}
            onChange={(e) => {
              patch({ held: e.currentTarget.checked });
            }}
          />
          {ru.eventDialog.held}
        </label>
        <label className={form.field}>
          <span className={form.label}>{ru.eventDialog.note}</span>
          <textarea
            className={form.input}
            rows={2}
            value={current.note}
            onChange={(e) => {
              patch({ note: e.currentTarget.value });
            }}
          />
          <span className={controls.hint}>{ru.eventDialog.noteHint}</span>
        </label>
        {error !== null && (
          <p className={form.error} role="alert">
            {error}
          </p>
        )}
      </form>
    </Dialog>
  );
}
