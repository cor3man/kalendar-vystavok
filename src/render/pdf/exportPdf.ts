// Entry point of the PDF chunk: the UI imports this module dynamically so jsPDF stays out of
// the main bundle. It only draws the LayoutResult it is given (CLAUDE.md).
import type { LayoutResult } from '../../layout/shapes.ts';
import { loadPdfAssets } from './pdfAssets.ts';
import { pdfFileName, renderPdf } from './renderPdf.ts';

export interface PdfFile {
  fileName: string;
  blob: Blob;
}

export async function createPdf(layout: LayoutResult): Promise<PdfFile> {
  const doc = renderPdf(layout, await loadPdfAssets(layout));
  return { fileName: pdfFileName(layout.page), blob: doc.output('blob') };
}
