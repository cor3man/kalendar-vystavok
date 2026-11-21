import { ru } from '../../i18n/ru.ts';
import type { BackupInfo } from '../../storage/Storage.ts';
import { useCalendarStore } from '../../state/storeContext.ts';
import controls from '../common/controls.module.css';
import { formatStamp } from '../common/formatTime.ts';
import styles from './screens.module.css';

/** SPEC 4.4: the data file is invalid; offer the newest valid backup. */
export function InvalidFileScreen({
  issues,
  backup,
}: {
  issues: readonly string[];
  backup: BackupInfo | null;
}) {
  const readOnly = useCalendarStore((s) => s.readOnly);
  const restoreNewestBackup = useCalendarStore((s) => s.restoreNewestBackup);
  const chooseOtherFolder = useCalendarStore((s) => s.chooseOtherFolder);

  return (
    <section className={styles.screen} data-testid="invalid-screen">
      <h2 className={styles.title}>{ru.invalid.title}</h2>
      <p role="alert">{ru.invalid.text}</p>
      <div className={styles.choices}>
        {backup === null ? (
          <p>{ru.invalid.noBackup}</p>
        ) : (
          <div>
            <button
              type="button"
              className={[controls.button, controls.primary].join(' ')}
              disabled={readOnly !== null}
              onClick={() => void restoreNewestBackup()}
            >
              {ru.invalid.restore(formatStamp(backup.stamp))}
            </button>
            <p className={controls.hint}>{ru.invalid.restoreHint}</p>
          </div>
        )}
        <div>
          <button type="button" className={controls.link} onClick={() => void chooseOtherFolder()}>
            {ru.start.other}
          </button>
        </div>
      </div>
      <details className={styles.details}>
        <summary>{ru.invalid.details}</summary>
        <pre>{issues.join('\n')}</pre>
      </details>
    </section>
  );
}
