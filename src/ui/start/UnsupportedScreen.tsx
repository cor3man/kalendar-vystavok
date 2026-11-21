import { ru } from '../../i18n/ru.ts';
import styles from './screens.module.css';

/** SPEC 5.1 "Unsupported": no File System Access in this browser. */
export function UnsupportedScreen() {
  return (
    <section className={styles.screen} data-testid="unsupported-screen">
      <h2 className={styles.title}>{ru.unsupported.title}</h2>
      <p>{ru.unsupported.text}</p>
    </section>
  );
}
