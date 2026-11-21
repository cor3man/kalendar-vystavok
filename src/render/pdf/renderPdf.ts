// LayoutResult → jsPDF document (SPEC 3.7). Draws shapes only; never computes layout (CLAUDE.md).
// No fetch, canvas or DOM here: fonts and rasterised images arrive in `PdfAssets`.
import { jsPDF } from 'jspdf';
import { FONT_FAMILY } from '../../layout/measure.ts';
import { COLORS, SIZES } from '../../layout/pageSpec.ts';
import type { LayoutResult, Rect, Shape, TextShape } from '../../layout/shapes.ts';

/** Millimetres per PostScript point. */
const MM_PER_PT = 25.4 / 72;

export interface PdfAssets {
  /** Base64-encoded TTF files of PT Sans Narrow (the same files the app bundles). */
  fonts: { regular: string; bold: string };
  /** PNG data URL for every `ImageShape.image.dataUrl` in the layout, keyed by that source data URL. */
  images: ReadonlyMap<string, string>;
}

const FONT_FILES = { regular: 'PTSansNarrow-Regular.ttf', bold: 'PTSansNarrow-Bold.ttf' } as const;

/** Font size in points for an em size in millimetres. */
export function mmToPt(mm: number): number {
  return mm / MM_PER_PT;
}

/**
 * Start point of a text so that its `align` end sits on the anchor (SPEC 6.3).
 * `width` is the advance width in mm; rotate 90 runs the text upwards (−y on the page).
 */
export function textStart(
  shape: Pick<TextShape, 'x' | 'y' | 'align' | 'rotate'>,
  width: number,
): { x: number; y: number } {
  const offset = shape.align === 'left' ? 0 : shape.align === 'right' ? width : width / 2;
  return shape.rotate === 90
    ? { x: shape.x, y: shape.y + offset }
    : { x: shape.x - offset, y: shape.y };
}

/** `Kalendar_<title>_<format>.pdf`; the en dash of "2027–2028" becomes "-" (SPEC 3.7). */
export function pdfFileName(page: LayoutResult['page']): string {
  return `Kalendar_${page.title.replace(/–/g, '-')}_${page.formatId}.pdf`;
}

function withClip(doc: jsPDF, clip: Rect | undefined, draw: () => void): void {
  if (clip === undefined) {
    draw();
    return;
  }
  doc.saveGraphicsState();
  doc.rect(clip.x, clip.y, clip.w, clip.h, null);
  doc.clip();
  doc.discardPath();
  draw();
  doc.restoreGraphicsState();
}

function drawText(doc: jsPDF, s: TextShape): void {
  doc.setFont(FONT_FAMILY, s.bold ? 'bold' : 'normal');
  doc.setFontSize(mmToPt(s.size));
  doc.setTextColor(s.color);
  const start = textStart(s, doc.getTextWidth(s.text));
  withClip(doc, s.clip, () => {
    doc.text(s.text, start.x, start.y, { angle: s.rotate, baseline: 'alphabetic' });
  });
}

function drawShape(doc: jsPDF, s: Shape, aliases: Map<string, string>, assets: PdfAssets): void {
  switch (s.kind) {
    case 'rect':
      doc.setFillColor(s.fill);
      doc.rect(s.x, s.y, s.w, s.h, 'F');
      return;
    case 'line':
      doc.setDrawColor(s.stroke);
      doc.setLineWidth(s.width);
      doc.setLineCap('butt');
      doc.line(s.x1, s.y1, s.x2, s.y2, 'S');
      return;
    case 'text':
      drawText(doc, s);
      return;
    case 'path': {
      const [first, ...rest] = s.points;
      if (first === undefined) return;
      doc.setDrawColor(s.stroke);
      doc.setLineWidth(s.width);
      doc.setLineCap('round');
      doc.setLineJoin('round');
      withClip(doc, s.clip, () => {
        doc.moveTo(first.x, first.y);
        for (const p of rest) doc.lineTo(p.x, p.y);
        doc.stroke();
      });
      return;
    }
    case 'image': {
      const png = assets.images.get(s.image.dataUrl);
      if (png === undefined) throw new Error('PDF asset missing for an image shape');
      // One alias per source image: jsPDF stores it once and reuses it (SPEC 3.7).
      let alias = aliases.get(s.image.dataUrl);
      if (alias === undefined) {
        alias = `img${String(aliases.size)}`;
        aliases.set(s.image.dataUrl, alias);
      }
      doc.addImage(png, 'PNG', s.x, s.y, s.w, s.h, alias, 'FAST');
      if (s.border) {
        doc.setDrawColor(COLORS.flagBorder);
        doc.setLineWidth(SIZES.flagBorderWidth);
        doc.rect(s.x, s.y, s.w, s.h, 'S');
      }
      return;
    }
  }
}

/** Draws the layout on one page of exactly the layout's size (SPEC 3.1, no scaling). */
export function renderPdf(layout: LayoutResult, assets: PdfAssets): jsPDF {
  const { page } = layout;
  const doc = new jsPDF({
    unit: 'mm',
    format: [page.w, page.h],
    orientation: page.w > page.h ? 'landscape' : 'portrait',
    compress: true,
  });
  doc.setDocumentProperties({ title: page.title });
  doc.addFileToVFS(FONT_FILES.regular, assets.fonts.regular);
  doc.addFileToVFS(FONT_FILES.bold, assets.fonts.bold);
  // No weight argument: jsPDF then keys the font by style only and setFont(family, 'bold') finds it.
  // TTF fonts default to Identity-H, so any Unicode text (Cyrillic) is embedded as real text.
  doc.addFont(FONT_FILES.regular, FONT_FAMILY, 'normal');
  doc.addFont(FONT_FILES.bold, FONT_FAMILY, 'bold');

  const aliases = new Map<string, string>();
  for (const shape of layout.shapes) drawShape(doc, shape, aliases, assets);
  return doc;
}
