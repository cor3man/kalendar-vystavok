import { useEffect } from 'react';
import { useStoreApi } from '../../state/storeContext.ts';

/** True when the key goes to a text field, which has its own undo. */
function isTextTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return (
    target.isContentEditable ||
    target instanceof HTMLTextAreaElement ||
    target instanceof HTMLSelectElement ||
    (target instanceof HTMLInputElement && !['checkbox', 'radio', 'button'].includes(target.type))
  );
}

/**
 * Ctrl+Z undoes, Ctrl+Y and Ctrl+Shift+Z redo (SPEC 5.6). Ignored in text fields and while a
 * dialog is open, so a dialog never shows data that changed under it.
 */
export function useUndoShortcuts(enabled: boolean): void {
  const store = useStoreApi();
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey) || e.altKey || isTextTarget(e.target)) return;
      if (document.querySelector('dialog[open]') !== null) return;
      const key = e.key.toLowerCase();
      // `code` keeps the shortcuts working with the Russian keyboard layout.
      const z = key === 'z' || e.code === 'KeyZ';
      const y = key === 'y' || e.code === 'KeyY';
      if (z && !e.shiftKey) {
        e.preventDefault();
        store.getState().undo();
      } else if (y || (z && e.shiftKey)) {
        e.preventDefault();
        store.getState().redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [enabled, store]);
}
