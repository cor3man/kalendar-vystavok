import { ru } from '../../i18n/ru.ts';
import controls from './controls.module.css';
import { Dialog } from './Dialog.tsx';

interface ConfirmDialogProps {
  title: string;
  text: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  title,
  text,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Dialog
      title={title}
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
            {confirmLabel}
          </button>
        </>
      }
    >
      <p>{text}</p>
    </Dialog>
  );
}
