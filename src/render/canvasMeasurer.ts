// Production TextMeasurer: canvas measureText with the loaded calendar font (SPEC 6.3).
import { FONT_FAMILY, type TextMeasurer } from '../layout/measure.ts';

/** Canvas font size used for measuring; widths are scaled linearly to the requested size. */
const REFERENCE_PX = 100;

function cssFont(bold: boolean): string {
  return `${bold ? '700' : '400'} ${String(REFERENCE_PX)}px "${FONT_FAMILY}"`;
}

/** Waits until both font weights are loaded, then measures with a 2D canvas. */
export async function createCanvasMeasurer(): Promise<TextMeasurer> {
  await Promise.all([document.fonts.load(cssFont(false)), document.fonts.load(cssFont(true))]);
  const ctx = document.createElement('canvas').getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D context is not available');
  const cache = new Map<string, number>();
  return {
    width(text, size, bold) {
      const key = `${bold ? 'b' : 'r'}|${text}`;
      let em = cache.get(key);
      if (em === undefined) {
        ctx.font = cssFont(bold);
        // No kerning: jsPDF does not kern, so the layout must not either (SPEC 3.7).
        ctx.fontKerning = 'none';
        em = ctx.measureText(text).width / REFERENCE_PX;
        cache.set(key, em);
      }
      return em * size;
    },
  };
}

let shared: Promise<TextMeasurer> | null = null;

/** One measurer for the whole app, so the preview and the PDF export lay out identically. */
export function getCanvasMeasurer(): Promise<TextMeasurer> {
  shared ??= createCanvasMeasurer().catch((error: unknown) => {
    shared = null;
    throw error;
  });
  return shared;
}
