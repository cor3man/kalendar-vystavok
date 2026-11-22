import { useState } from 'react';
import { ru } from '../../i18n/ru.ts';
import { layoutCalendar } from '../../layout/layout.ts';
import { getCanvasMeasurer } from '../../render/canvasMeasurer.ts';
import type { PdfFile } from '../../render/pdf/exportPdf.ts';
import { todayISO } from '../../state/clock.ts';
import { useStoreApi } from '../../state/storeContext.ts';
import { downloadBlob } from '../common/download.ts';
import styles from './Toolbar.module.css';

type Status = { kind: 'idle' } | { kind: 'busy' } | { kind: 'message'; text: string };

function download({ fileName, blob }: PdfFile): void {
  downloadBlob(blob, fileName);
}

/** "Печать" and "Скачать PDF" (SPEC 3.7). The PDF draws the same layout as the preview. */
export function PdfActions() {
  const store = useStoreApi();
  const [status, setStatus] = useState<Status>({ kind: 'idle' });
  const busy = status.kind === 'busy';

  async function build(): Promise<PdfFile> {
    const { data, year, format } = store.getState();
    if (data === null) throw new Error('No data to export');
    const [measurer, { createPdf }] = await Promise.all([
      getCanvasMeasurer(),
      import('../../render/pdf/exportPdf.ts'),
    ]);
    // Same inputs and measurer as the preview: the layout is deterministic, so the shapes match.
    const layout = layoutCalendar({ data, year, format, exportDate: todayISO(), measurer });
    return createPdf(layout);
  }

  async function run(action: (file: PdfFile) => string | null, onError?: () => void) {
    setStatus({ kind: 'busy' });
    try {
      const message = action(await build());
      setStatus(message === null ? { kind: 'idle' } : { kind: 'message', text: message });
    } catch (error: unknown) {
      onError?.();
      console.error(error);
      setStatus({ kind: 'message', text: ru.pdf.error });
    }
  }

  function onDownload() {
    void run((file) => {
      download(file);
      return null;
    });
  }

  function onPrint() {
    // Open the tab inside the click handler; opened later, it would be blocked as a pop-up.
    const tab = window.open('', '_blank');
    void run(
      (file) => {
        if (tab === null) {
          download(file);
          return ru.pdf.popupBlocked;
        }
        // The tab keeps the blob URL alive for as long as it shows the PDF.
        tab.location.href = URL.createObjectURL(file.blob);
        return null;
      },
      () => tab?.close(),
    );
  }

  return (
    <div className={styles.group}>
      <button type="button" className={styles.button} disabled={busy} onClick={onPrint}>
        {ru.pdf.print}
      </button>
      <button
        type="button"
        className={[styles.button, styles.primary].join(' ')}
        disabled={busy}
        onClick={onDownload}
      >
        {ru.pdf.download}
      </button>
      <span className={styles.status} role="status">
        {status.kind === 'busy' ? ru.pdf.busy : status.kind === 'message' ? status.text : ''}
      </span>
    </div>
  );
}
