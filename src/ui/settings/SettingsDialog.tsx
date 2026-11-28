import { useState } from 'react';
import { COLOR_GRID } from '../../domain/colorGrid.ts';
import type { WeekendTint } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import { useCalendarStore, useStoreApi } from '../../state/storeContext.ts';
import controls from '../common/controls.module.css';
import { Dialog } from '../common/Dialog.tsx';
import form from '../common/form.module.css';
import { ColorPicker } from '../dialogs/ColorPicker.tsx';
import { RadioField } from './RadioField.tsx';
import styles from './settings.module.css';

interface SettingsDialogProps {
  onClose: () => void;
}

type TintChoice = 'grey' | 'pink' | 'custom';

/** First custom weekend tint offered when «Другой…» is picked (lilac, tint 1). */
const DEFAULT_CUSTOM_TINT = COLOR_GRID.lilac[0];

function tintChoice(tint: WeekendTint): TintChoice {
  if (tint === 'grey') return 'grey';
  if (tint === 'pink') return 'pink';
  return 'custom';
}

/** «Настройки» (SPEC 5.10): every change applies at once and is saved; none is an undo step. */
export function SettingsDialog({ onClose }: SettingsDialogProps) {
  const store = useStoreApi();
  const settings = useCalendarStore((s) => s.data?.settings);
  // The last custom tint of this session, so switching to grey and back keeps it.
  const [lastCustom, setLastCustom] = useState<string | null>(() => {
    const tint = store.getState().data?.settings.weekendTint;
    return tint !== undefined && tintChoice(tint) === 'custom' ? tint : null;
  });
  if (settings === undefined) return null;
  const update = store.getState().updatePreferences;
  const choice = tintChoice(settings.weekendTint);

  const close = () => {
    // A custom tint joins the recent colours once, not on every slider step (5.4).
    const tint = store.getState().data?.settings.weekendTint;
    if (tint !== undefined && tintChoice(tint) === 'custom') store.getState().rememberColor(tint);
    onClose();
  };

  return (
    <Dialog
      title={ru.settings.title}
      onClose={close}
      testId="settings-dialog"
      actions={
        <button type="button" className={controls.button} onClick={close}>
          {ru.common.close}
        </button>
      }
    >
      <div className={form.form}>
        <RadioField
          legend={ru.settings.selectionMode}
          value={settings.selectionMode}
          options={[
            { value: 'click-shift', label: ru.settings.selectionClickShift },
            { value: 'drag', label: ru.settings.selectionDrag },
          ]}
          onChange={(selectionMode) => {
            update({ selectionMode });
          }}
        />
        <RadioField<TintChoice>
          legend={ru.settings.weekendTint}
          value={choice}
          options={[
            { value: 'grey', label: ru.settings.tintGrey },
            { value: 'pink', label: ru.settings.tintPink },
            { value: 'custom', label: ru.settings.tintCustom },
          ]}
          onChange={(next) => {
            update({ weekendTint: next === 'custom' ? (lastCustom ?? DEFAULT_CUSTOM_TINT) : next });
          }}
        />
        {choice === 'custom' && (
          <div className={styles.custom}>
            <ColorPicker
              label={ru.settings.customTint}
              value={settings.weekendTint}
              onChange={(weekendTint) => {
                setLastCustom(weekendTint);
                update({ weekendTint });
              }}
            />
          </div>
        )}
        <label className={form.check}>
          <input
            type="checkbox"
            checked={settings.heldMark === 'show'}
            onChange={(e) => {
              update({ heldMark: e.currentTarget.checked ? 'show' : 'none' });
            }}
          />
          {ru.settings.heldMark}
        </label>
        <RadioField
          legend={ru.settings.startup}
          value={settings.startup}
          options={[
            { value: 'last', label: ru.settings.startupLast },
            { value: 'current', label: ru.settings.startupCurrent },
          ]}
          onChange={(startup) => {
            update({ startup });
          }}
        />
      </div>
    </Dialog>
  );
}
