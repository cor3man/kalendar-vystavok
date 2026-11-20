// Font metrics injected into the layout (SPEC 6.3).

/**
 * Measures text in the calendar font (PT Sans Narrow).
 * `size` is the em size in mm; the result is the advance width in mm.
 * Production: canvas measureText with the loaded font; tests: fontkit on the same TTF.
 */
export interface TextMeasurer {
  width(text: string, size: number, bold: boolean): number;
}

/** Vertical metrics of PT Sans Narrow per em (unitsPerEm 1000, ascent 1018, descent 276, cap 700). */
export const FONT_METRICS = {
  ascent: 1.018,
  descent: 0.276,
  capHeight: 0.7,
} as const;

/** Font family name shared by the SVG preview, the canvas measurer and (M2) the PDF. */
export const FONT_FAMILY = 'PT Sans Narrow';
