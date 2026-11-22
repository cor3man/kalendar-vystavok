import { useEffect, useId, useRef, type ReactNode } from 'react';
import styles from './Dialog.module.css';

interface DialogProps {
  title: string;
  /** Esc or the backdrop's cancel event. */
  onClose: () => void;
  children: ReactNode;
  /** Buttons, right-aligned at the bottom. */
  actions?: ReactNode;
  testId?: string;
  wide?: boolean;
}

/**
 * Modal dialog on the native <dialog>: focus is trapped while open and returned to the element
 * that had it before (SPEC 5.9). Returning focus never scrolls: the opener may be off-screen
 * (e.g. an event-list button the user scrolled away from), and the page must stay where it was.
 */
export function Dialog({ title, onClose, children, actions, testId, wide = false }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const dialog = ref.current;
    if (dialog === null) return;
    const previous = document.activeElement;
    dialog.showModal();
    return () => {
      dialog.close();
      if (previous instanceof HTMLElement) previous.focus({ preventScroll: true });
    };
  }, []);

  return (
    <dialog
      ref={ref}
      className={wide ? [styles.dialog, styles.wide].join(' ') : styles.dialog}
      aria-labelledby={titleId}
      data-testid={testId}
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <h2 id={titleId} className={styles.title}>
        {title}
      </h2>
      {children}
      {actions !== undefined && <div className={styles.actions}>{actions}</div>}
    </dialog>
  );
}
