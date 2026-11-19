import styles from './App.module.css';
import { formatVersion } from './appInfo.ts';
import { appVersion } from './version.ts';
import { ru } from './i18n/ru.ts';

export function App() {
  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <h1 className={styles.title}>{ru.appName}</h1>
      </main>
      <footer className={styles.footer}>
        {ru.versionLabel} <span data-testid="app-version">{formatVersion(appVersion)}</span>
      </footer>
    </div>
  );
}
