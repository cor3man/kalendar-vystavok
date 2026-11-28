import { useState } from 'react';
import { ru } from '../../i18n/ru.ts';
import { isWritable } from '../../state/store.ts';
import { useCalendarStore } from '../../state/storeContext.ts';
import { SettingsDialog } from '../settings/SettingsDialog.tsx';
import styles from './Toolbar.module.css';

/** Toolbar «Настройки» (SPEC 5.2, 5.10); settings are saved with the data, so read-only disables it. */
export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const editable = useCalendarStore(isWritable);
  return (
    <>
      <button
        type="button"
        className={styles.button}
        disabled={!editable}
        onClick={() => {
          setOpen(true);
        }}
      >
        {ru.settings.open}
      </button>
      {open && editable && (
        <SettingsDialog
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
