import { useEffect } from 'react';
import { ru } from '../../i18n/ru.ts';
import { useCalendarStore, useStoreApi, useUi, useUiApi } from '../../state/storeContext.ts';
import controls from '../common/controls.module.css';
import styles from './main.module.css';

/** SPEC 5.4: the toast «Удалено. Отменить» stays for 8 s. */
export const TOAST_MS = 8000;

/**
 * Toast after deleting an event. It disappears after 8 s or on the next data change, so its
 * "Отменить" always undoes the delete.
 */
export function DeleteToast() {
  const store = useStoreApi();
  const ui = useUiApi();
  const toast = useUi((s) => s.toast);
  const editCount = useCalendarStore((s) => s.editCount);
  const stale = toast !== null && toast.editCount !== editCount;

  useEffect(() => {
    if (toast === null) return;
    if (stale) {
      ui.getState().showToast(null);
      return;
    }
    const timer = setTimeout(() => {
      ui.getState().showToast(null);
    }, TOAST_MS);
    return () => {
      clearTimeout(timer);
    };
  }, [toast, stale, ui]);

  if (toast === null || stale) return null;
  return (
    <div className={styles.toast} role="status" data-testid="delete-toast">
      <span>{ru.eventDialog.deleted}</span>
      <button
        type="button"
        className={controls.button}
        onClick={() => {
          ui.getState().showToast(null);
          store.getState().undo();
        }}
      >
        {ru.eventDialog.undoDelete}
      </button>
    </div>
  );
}
