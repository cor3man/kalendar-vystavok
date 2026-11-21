import { ru } from '../../i18n/ru.ts';
import { useCalendarStore, useStoreApi } from '../../state/storeContext.ts';
import styles from './Banner.module.css';
import controls from './controls.module.css';
import { downloadJson } from './download.ts';

/** SPEC 4.3: persistent banner while a save fails; the data stays in memory. */
export function SaveErrorBanner() {
  const store = useStoreApi();
  const failed = useCalendarStore((s) => s.saveError === 'failed');
  const saving = useCalendarStore((s) => s.saving);
  if (!failed) return null;

  function onDownload() {
    const snapshot = store.getState().exportSnapshot();
    if (snapshot !== null) downloadJson(snapshot.text, snapshot.fileName);
  }

  return (
    <div className={[styles.banner, styles.error].join(' ')} role="alert" data-testid="save-error">
      <p className={styles.text}>{ru.save.failed}</p>
      <div className={controls.row}>
        <button
          type="button"
          className={controls.button}
          disabled={saving}
          onClick={() => void store.getState().flushSave()}
        >
          {ru.save.retry}
        </button>
        <button
          type="button"
          className={[controls.button, controls.primary].join(' ')}
          onClick={onDownload}
        >
          {ru.save.downloadBackup}
        </button>
      </div>
    </div>
  );
}
