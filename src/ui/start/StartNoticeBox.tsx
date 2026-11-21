import { ru } from '../../i18n/ru.ts';
import type { StartNotice } from '../../state/store.ts';
import { useCalendarStore } from '../../state/storeContext.ts';
import controls from '../common/controls.module.css';
import styles from './screens.module.css';

/** Result of the last connect attempt on the start screen. */
export function StartNoticeBox({ notice }: { notice: StartNotice }) {
  const openPickedFolder = useCalendarStore((s) => s.openPickedFolder);
  return (
    <div className={styles.notice} role="alert">
      {notice === 'folderHasData' ? (
        <>
          <p>{ru.start.folderHasData}</p>
          <button
            type="button"
            className={[controls.button, controls.primary].join(' ')}
            onClick={() => void openPickedFolder()}
          >
            {ru.start.openThem}
          </button>
        </>
      ) : (
        <p>{notice === 'folderHasNoData' ? ru.start.folderHasNoData : ru.start.error}</p>
      )}
    </div>
  );
}
