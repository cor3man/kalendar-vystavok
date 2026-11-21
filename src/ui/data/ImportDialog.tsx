import { ru } from '../../i18n/ru.ts';
import type { DataFile } from '../../domain/types.ts';
import { summarizeData, type DataSummary } from '../../storage/importSummary.ts';
import controls from '../common/controls.module.css';
import { Dialog } from '../common/Dialog.tsx';
import styles from './DataDialog.module.css';

interface ImportDialogProps {
  data: DataFile;
  onConfirm: () => void;
  onCancel: () => void;
}

const COUNT_KEYS: readonly (keyof DataSummary)[] = [
  'exhibitions',
  'events',
  'countries',
  'holidays',
];

/** SPEC 4.7: counts per entity, then replace after confirmation. */
export function ImportDialog({ data, onConfirm, onCancel }: ImportDialogProps) {
  const counts = summarizeData(data);
  return (
    <Dialog
      title={ru.data.importTitle}
      testId="import-dialog"
      onClose={onCancel}
      actions={
        <>
          <button type="button" className={controls.button} onClick={onCancel}>
            {ru.common.cancel}
          </button>
          <button
            type="button"
            className={[controls.button, controls.primary].join(' ')}
            onClick={onConfirm}
          >
            {ru.data.importDo}
          </button>
        </>
      }
    >
      <ul className={styles.counts}>
        {COUNT_KEYS.map((key) => (
          <li key={key}>
            {ru.data.counts[key]}: <strong>{counts[key]}</strong>
          </li>
        ))}
      </ul>
      <p>{ru.data.importConfirm}</p>
    </Dialog>
  );
}
