import { ru } from '../../i18n/ru.ts';
import { useCalendarStore } from '../../state/storeContext.ts';
import controls from './controls.module.css';
import { Dialog } from './Dialog.tsx';

/** SPEC 4.3: the data file changed on disk; autosave waits for the user's choice. */
export function ConflictDialog() {
  const conflict = useCalendarStore((s) => s.saveError === 'conflict');
  const resolveConflict = useCalendarStore((s) => s.resolveConflict);
  if (!conflict) return null;

  return (
    <Dialog
      title={ru.conflict.title}
      testId="conflict-dialog"
      // A choice is required: Esc does not close it.
      onClose={() => undefined}
      actions={
        <>
          <button
            type="button"
            className={controls.button}
            onClick={() => void resolveConflict('reload')}
          >
            {ru.conflict.reload}
          </button>
          <button
            type="button"
            className={[controls.button, controls.primary].join(' ')}
            onClick={() => void resolveConflict('overwrite')}
          >
            {ru.conflict.overwrite}
          </button>
        </>
      }
    >
      <p>{ru.conflict.text}</p>
      <p className={controls.hint}>
        «{ru.conflict.reload}»: {ru.conflict.reloadHint}
      </p>
      <p className={controls.hint}>
        «{ru.conflict.overwrite}»: {ru.conflict.overwriteHint}
      </p>
    </Dialog>
  );
}
