import { useState } from 'react';
import { ru } from '../../i18n/ru.ts';
import { DataDialog } from '../data/DataDialog.tsx';
import styles from './Toolbar.module.css';

/** Toolbar "Данные" (SPEC 5.2) opening the Data screen. */
export function DataButton() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        className={styles.button}
        onClick={() => {
          setOpen(true);
        }}
      >
        {ru.data.open}
      </button>
      {open && (
        <DataDialog
          onClose={() => {
            setOpen(false);
          }}
        />
      )}
    </>
  );
}
