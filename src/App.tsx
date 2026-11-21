import styles from './App.module.css';
import { formatVersion } from './appInfo.ts';
import { appVersion } from './version.ts';
import { ru } from './i18n/ru.ts';
import { Toolbar } from './ui/toolbar/Toolbar.tsx';
import { CalendarPreview } from './ui/calendar/CalendarPreview.tsx';

export function App() {
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>{ru.appName}</h1>
        <Toolbar />
      </header>
      <main className={styles.main}>
        <CalendarPreview />
      </main>
      <footer className={styles.footer}>
        {ru.versionLabel} <span data-testid="app-version">{formatVersion(appVersion)}</span>
      </footer>
    </div>
  );
}
