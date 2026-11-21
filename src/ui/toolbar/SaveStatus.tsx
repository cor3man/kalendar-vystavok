import { ru } from '../../i18n/ru.ts';
import type { CalendarState } from '../../state/store.ts';
import { useCalendarStore } from '../../state/storeContext.ts';
import styles from './Toolbar.module.css';

type Status = 'saved' | 'saving' | 'error' | 'none';

function saveStatus(s: CalendarState): Status {
  if (s.readOnly !== null) return 'none';
  if (s.saveError !== null) return 'error';
  if (s.saving || s.revision !== s.savedRevision) return 'saving';
  return 'saved';
}

/** SPEC 4.3: "Сохранено" / "Сохранение…" / "Ошибка сохранения". */
export function SaveStatus() {
  const status = useCalendarStore(saveStatus);
  if (status === 'none') return null;
  return (
    <span className={styles.status} role="status" data-testid="save-status" data-status={status}>
      {status === 'saved' ? ru.save.saved : status === 'saving' ? ru.save.saving : ru.save.error}
    </span>
  );
}
