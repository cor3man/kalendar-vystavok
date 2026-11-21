import { useEffect, useState } from 'react';
import { ru } from '../../i18n/ru.ts';
import type { BackupInfo } from '../../storage/Storage.ts';
import { useCalendarStore } from '../../state/storeContext.ts';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';
import controls from '../common/controls.module.css';
import { formatStamp } from '../common/formatTime.ts';
import styles from './DataDialog.module.css';

interface BackupListProps {
  disabled: boolean;
  onRestored: () => void;
  onError: () => void;
}

/** Backups in the data folder, newest first, each restorable after confirmation (SPEC 5.1). */
export function BackupList({ disabled, onRestored, onError }: BackupListProps) {
  const listBackups = useCalendarStore((s) => s.listBackups);
  const restoreBackup = useCalendarStore((s) => s.restoreBackup);
  const [backups, setBackups] = useState<BackupInfo[] | null>(null);
  const [confirming, setConfirming] = useState<BackupInfo | null>(null);

  useEffect(() => {
    let active = true;
    listBackups().then(
      (list) => {
        if (active) setBackups(list);
      },
      (error: unknown) => {
        console.error(error);
        if (active) setBackups([]);
      },
    );
    return () => {
      active = false;
    };
  }, [listBackups]);

  async function restore(backup: BackupInfo) {
    setConfirming(null);
    try {
      await restoreBackup(backup.name);
      onRestored();
    } catch (error: unknown) {
      console.error(error);
      onError();
    }
  }

  if (backups === null) return <p className={controls.hint}>{ru.loading}</p>;
  if (backups.length === 0) return <p className={controls.hint}>{ru.data.noBackups}</p>;

  return (
    <>
      <ul className={styles.backups} data-testid="backup-list">
        {backups.map((b) => (
          <li key={b.name} className={styles.backup}>
            <span className={styles.backupStamp}>{formatStamp(b.stamp)}</span>
            <span className={controls.hint}>
              {ru.data.sizeKb(Math.max(1, Math.round(b.size / 1024)))}
            </span>
            <button
              type="button"
              className={controls.button}
              disabled={disabled}
              onClick={() => {
                setConfirming(b);
              }}
            >
              {ru.data.restore}
            </button>
          </li>
        ))}
      </ul>
      {confirming !== null && (
        <ConfirmDialog
          title={ru.common.confirm}
          text={ru.data.restoreConfirm(formatStamp(confirming.stamp))}
          confirmLabel={ru.data.restore}
          onConfirm={() => void restore(confirming)}
          onCancel={() => {
            setConfirming(null);
          }}
        />
      )}
    </>
  );
}
