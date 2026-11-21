import { ru } from '../../i18n/ru.ts';
import type { StartNotice } from '../../state/store.ts';
import { useCalendarStore } from '../../state/storeContext.ts';
import controls from '../common/controls.module.css';
import styles from './screens.module.css';
import { StartNoticeBox } from './StartNoticeBox.tsx';

const primary = [controls.button, controls.primary].join(' ');

/** SPEC 5.1 "Start": connect a data folder (4.2). */
export function StartScreen({
  remembered,
  notice,
}: {
  remembered: boolean;
  notice: StartNotice | null;
}) {
  const readOnly = useCalendarStore((s) => s.readOnly);
  const createFolder = useCalendarStore((s) => s.createFolder);
  const openFolder = useCalendarStore((s) => s.openFolder);
  const resume = useCalendarStore((s) => s.resume);
  const chooseOtherFolder = useCalendarStore((s) => s.chooseOtherFolder);

  return (
    <section className={styles.screen} data-testid="start-screen">
      <h2 className={styles.title}>{ru.start.title}</h2>
      <p>{ru.start.intro}</p>
      {notice !== null && <StartNoticeBox notice={notice} />}
      {remembered ? (
        <div className={styles.choices}>
          <div>
            <button type="button" className={primary} onClick={() => void resume()}>
              {ru.start.resume}
            </button>
            <p className={controls.hint}>{ru.start.resumeHint}</p>
          </div>
          <div>
            <button
              type="button"
              className={controls.link}
              onClick={() => void chooseOtherFolder()}
            >
              {ru.start.other}
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.choices}>
          {readOnly === null && (
            <div>
              <button type="button" className={primary} onClick={() => void createFolder()}>
                {ru.start.create}
              </button>
              <p className={controls.hint}>{ru.start.createHint}</p>
            </div>
          )}
          <div>
            <button type="button" className={controls.button} onClick={() => void openFolder()}>
              {ru.start.open}
            </button>
            <p className={controls.hint}>{ru.start.openHint}</p>
          </div>
        </div>
      )}
      <p className={controls.hint}>{ru.start.syncHint}</p>
    </section>
  );
}
