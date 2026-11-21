import { useRef, useState } from 'react';
import { formatVersion } from '../../appInfo.ts';
import type { DataFile } from '../../domain/types.ts';
import { ru } from '../../i18n/ru.ts';
import { useCalendarStore, useStoreApi } from '../../state/storeContext.ts';
import { appVersion } from '../../version.ts';
import { ConfirmDialog } from '../common/ConfirmDialog.tsx';
import controls from '../common/controls.module.css';
import { Dialog } from '../common/Dialog.tsx';
import { downloadJson } from '../common/download.ts';
import { formatDateTime } from '../common/formatTime.ts';
import { BackupList } from './BackupList.tsx';
import styles from './DataDialog.module.css';
import { ImportDialog } from './ImportDialog.tsx';

/** SPEC 5.1 "Data": folder, last save, backups, export / import (4.7), change folder, version. */
export function DataDialog({ onClose }: { onClose: () => void }) {
  const store = useStoreApi();
  const folderName = useCalendarStore((s) => s.folderName);
  const lastSavedAt = useCalendarStore((s) => s.lastSavedAt);
  const readOnly = useCalendarStore((s) => s.readOnly !== null);
  const fileInput = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [importing, setImporting] = useState<DataFile | null>(null);
  const [confirmDiscard, setConfirmDiscard] = useState(false);

  function onExport() {
    const snapshot = store.getState().exportSnapshot();
    if (snapshot !== null) downloadJson(snapshot.text, snapshot.fileName);
  }

  async function onFile(file: File) {
    setMessage(null);
    const result = store.getState().readImportFile(await file.text());
    if (result.kind === 'ok') setImporting(result.data);
    else setMessage(result.kind === 'newer' ? ru.data.importNewer : ru.data.importInvalid);
  }

  async function doImport(data: DataFile) {
    setImporting(null);
    try {
      await store.getState().importData(data);
      onClose();
    } catch (error: unknown) {
      console.error(error);
      setMessage(ru.data.actionError);
    }
  }

  async function changeFolder(discard: boolean) {
    setConfirmDiscard(false);
    if (!(await store.getState().changeFolder({ discard }))) setConfirmDiscard(true);
  }

  return (
    <Dialog
      title={ru.data.title}
      testId="data-dialog"
      onClose={onClose}
      actions={
        <button type="button" className={controls.button} onClick={onClose}>
          {ru.common.close}
        </button>
      }
    >
      <dl className={styles.facts}>
        <dt>{ru.data.folder}</dt>
        <dd data-testid="data-folder">{folderName ?? ru.data.never}</dd>
        <dt>{ru.data.lastSave}</dt>
        <dd>{lastSavedAt === null ? ru.data.never : formatDateTime(lastSavedAt)}</dd>
        <dt>{ru.data.version}</dt>
        <dd>{formatVersion(appVersion)}</dd>
      </dl>

      <div className={controls.row}>
        <button type="button" className={controls.button} onClick={onExport}>
          {ru.data.export}
        </button>
        <button
          type="button"
          className={controls.button}
          disabled={readOnly}
          onClick={() => fileInput.current?.click()}
        >
          {ru.data.import}
        </button>
        <input
          ref={fileInput}
          className={styles.fileInput}
          type="file"
          accept=".json,application/json"
          data-testid="import-file"
          onChange={(e) => {
            const file = e.currentTarget.files?.[0];
            e.currentTarget.value = '';
            if (file !== undefined) void onFile(file);
          }}
        />
      </div>
      <p className={controls.hint}>
        {ru.data.exportHint} {ru.data.importHint}
      </p>
      {message !== null && (
        <p className={styles.message} role="alert">
          {message}
        </p>
      )}

      <section className={styles.section}>
        <h3 className={styles.sectionTitle}>{ru.data.backups}</h3>
        <p className={controls.hint}>{ru.data.backupsHint}</p>
        <BackupList
          disabled={readOnly}
          onRestored={onClose}
          onError={() => {
            setMessage(ru.data.actionError);
          }}
        />
      </section>

      <section className={styles.section}>
        <button type="button" className={controls.link} onClick={() => void changeFolder(false)}>
          {ru.data.changeFolder}
        </button>
      </section>

      {importing !== null && (
        <ImportDialog
          data={importing}
          onConfirm={() => void doImport(importing)}
          onCancel={() => {
            setImporting(null);
          }}
        />
      )}
      {confirmDiscard && (
        <ConfirmDialog
          title={ru.common.confirm}
          text={ru.data.unsavedConfirm}
          confirmLabel={ru.data.changeFolder}
          onConfirm={() => void changeFolder(true)}
          onCancel={() => {
            setConfirmDiscard(false);
          }}
        />
      )}
    </Dialog>
  );
}
