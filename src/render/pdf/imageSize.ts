// Pixel size of the PNG embedded for an image in the PDF (SPEC 3.7, 7.1). jsPDF decodes and
// re-compresses every PNG in JavaScript, so export time grows with the pixel count; an image
// gets the pixels its largest printed size needs at printer resolution, and no more.
import type { LayoutResult } from '../../layout/shapes.ts';

/** Office laser printers print at 600 dpi; more pixels cannot be printed. */
export const PRINT_DPI = 600;
const MM_PER_INCH = 25.4;

export interface PixelSize {
  width: number;
  height: number;
}

export interface ImageNeed {
  /** Source pixel size (ImageData.width / height). */
  source: PixelSize;
  /** Largest drawn size of this image on the page, in mm. */
  w: number;
  h: number;
}

/** Largest drawn size of every distinct image (keyed by its data URL) in the layout. */
export function imageNeeds(layout: LayoutResult): Map<string, ImageNeed> {
  const needs = new Map<string, ImageNeed>();
  for (const s of layout.shapes) {
    if (s.kind !== 'image') continue;
    const known = needs.get(s.image.dataUrl);
    needs.set(s.image.dataUrl, {
      source: { width: s.image.width, height: s.image.height },
      w: Math.max(known?.w ?? 0, s.w),
      h: Math.max(known?.h ?? 0, s.h),
    });
  }
  return needs;
}

function printPixels(mm: number): number {
  return Math.max(1, Math.ceil((mm / MM_PER_INCH) * PRINT_DPI));
}

/**
 * Pixel size to embed. Vector images (SVG) are rasterised at exactly the printed size.
 * Raster images are only ever made smaller, never enlarged, keeping their aspect ratio;
 * `null` means "embed the source as it is".
 */
export function targetPixels(need: ImageNeed, vector: boolean): PixelSize | null {
  const want = { width: printPixels(need.w), height: printPixels(need.h) };
  if (vector) return want;
  const { width, height } = need.source;
  const scale = Math.max(want.width / width, want.height / height);
  if (scale >= 1) return null;
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}
