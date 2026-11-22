import styles from './App.module.css';
import { formatVersion } from './appInfo.ts';
import { appVersion } from './version.ts';
import { ru } from './i18n/ru.ts';
import { useCalendarStore } from './state/storeContext.ts';
import { ConflictDialog } from './ui/common/ConflictDialog.tsx';
import { ReadOnlyBanner } from './ui/common/ReadOnlyBanner.tsx';
import { SaveErrorBanner } from './ui/common/SaveErrorBanner.tsx';
import { UpdateBanner } from './ui/common/UpdateBanner.tsx';
import { Toolbar } from './ui/toolbar/Toolbar.tsx';
import { EditingDialogs } from './ui/main/EditingDialogs.tsx';
import { MainScreen } from './ui/main/MainScreen.tsx';
import { InvalidFileScreen } from './ui/start/InvalidFileScreen.tsx';
import { StartScreen } from './ui/start/StartScreen.tsx';
import { UnsupportedScreen } from './ui/start/UnsupportedScreen.tsx';

function Screen() {
  const phase = useCalendarStore((s) => s.phase);
  switch (phase.kind) {
    case 'checking':
    case 'busy':
      return (
        <p className={styles.loading} role="status">
          {ru.loading}
        </p>
      );
    case 'unsupported':
      return <UnsupportedScreen />;
    case 'start':
      return <StartScreen remembered={phase.remembered} notice={phase.notice} />;
    case 'invalid':
      return <InvalidFileScreen issues={phase.issues} backup={phase.backup} />;
    case 'ready':
      return <MainScreen />;
  }
}

export function App() {
  const ready = useCalendarStore((s) => s.phase.kind === 'ready');
  return (
    <div className={styles.app}>
      <header className={styles.header}>
        <h1 className={styles.title}>{ru.appName}</h1>
        {ready && <Toolbar />}
      </header>
      <UpdateBanner />
      <ReadOnlyBanner />
      <SaveErrorBanner />
      <main className={styles.main}>
        <Screen />
      </main>
      {ready && <EditingDialogs />}
      <ConflictDialog />
      <footer className={styles.footer}>
        {ru.versionLabel} <span data-testid="app-version">{formatVersion(appVersion)}</span>
      </footer>
    </div>
  );
}
