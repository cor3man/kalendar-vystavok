import { ru } from '../../i18n/ru.ts';
import { useCalendarStore } from '../../state/storeContext.ts';
import styles from './Banner.module.css';

/** SPEC 4.6 (another tab) and 4.4 (newer file version). */
export function ReadOnlyBanner() {
  const readOnly = useCalendarStore((s) => s.readOnly);
  if (readOnly === null) return null;
  return (
    <div className={styles.banner} role="status" data-testid="read-only-banner">
      <p className={styles.text}>{ru.readOnly[readOnly]}</p>
    </div>
  );
}
