import { ru } from '../../i18n/ru.ts';
import { isWritable } from '../../state/store.ts';
import { useCalendarStore, useUiApi } from '../../state/storeContext.ts';
import styles from './Toolbar.module.css';

/** Toolbar "Каталог" and "Праздники" (SPEC 5.2), opening their dialogs. */
export function EditorButtons() {
  const ui = useUiApi();
  const editable = useCalendarStore(isWritable);
  return (
    <div className={styles.group}>
      <button
        type="button"
        className={styles.button}
        disabled={!editable}
        onClick={() => {
          ui.getState().setCatalogueOpen(true);
        }}
      >
        {ru.editing.catalogue}
      </button>
      <button
        type="button"
        className={styles.button}
        disabled={!editable}
        onClick={() => {
          ui.getState().setHolidaysOpen(true);
        }}
      >
        {ru.editing.holidays}
      </button>
    </div>
  );
}
