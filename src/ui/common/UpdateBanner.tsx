import { ru } from '../../i18n/ru.ts';
import { useUpdate, useUpdateApi } from '../../state/storeContext.ts';
import styles from './Banner.module.css';
import controls from './controls.module.css';

/** SPEC 5.9: the "new version available" banner. Reloads only on request, never under a dialog. */
export function UpdateBanner() {
  const update = useUpdateApi();
  const available = useUpdate((s) => s.available);
  const updating = useUpdate((s) => s.updating);
  if (!available) return null;

  return (
    <div className={styles.banner} role="status" data-testid="update-banner">
      <p className={styles.text}>{ru.update.available}</p>
      <button
        type="button"
        className={[controls.button, controls.primary].join(' ')}
        disabled={updating}
        onClick={() => void update.getState().update()}
      >
        {updating ? ru.update.applying : ru.update.apply}
      </button>
    </div>
  );
}
