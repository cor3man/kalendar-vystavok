import { ru } from '../../i18n/ru.ts';
import { canRedo, canUndo } from '../../state/store.ts';
import { useCalendarStore, useStoreApi } from '../../state/storeContext.ts';
import styles from './Toolbar.module.css';

/** Toolbar undo / redo (SPEC 5.6). */
export function UndoButtons() {
  const store = useStoreApi();
  const undo = useCalendarStore(canUndo);
  const redo = useCalendarStore(canRedo);
  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.button}
        disabled={!undo}
        aria-label={ru.editing.undo}
        title={ru.editing.undoHint}
        onClick={() => {
          store.getState().undo();
        }}
      >
        ↶
      </button>
      <button
        type="button"
        className={styles.button}
        disabled={!redo}
        aria-label={ru.editing.redo}
        title={ru.editing.redoHint}
        onClick={() => {
          store.getState().redo();
        }}
      >
        ↷
      </button>
    </div>
  );
}
