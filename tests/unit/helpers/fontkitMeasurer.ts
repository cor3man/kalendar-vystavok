// TextMeasurer for tests: fontkit on the same TTF files the app bundles (SPEC 6.3).
import { openSync, type Font } from 'fontkit';
import { fileURLToPath } from 'node:url';
import type { TextMeasurer } from '../../../src/layout/measure.ts';

const fontDir = fileURLToPath(new URL('../../../src/render/fonts/', import.meta.url));

function load(file: string): Font {
  const font = openSync(fontDir + file);
  if (!('layout' in font)) throw new Error(`${file} is a font collection`);
  return font;
}

const regular = load('PTSansNarrow-Regular.ttf');
const bold = load('PTSansNarrow-Bold.ttf');

export function createFontkitMeasurer(): TextMeasurer {
  const cache = new Map<string, number>();
  return {
    width(text, size, isBold) {
      const key = `${isBold ? 'b' : 'r'}|${text}`;
      let units = cache.get(key);
      if (units === undefined) {
        const font = isBold ? bold : regular;
        // No kerning: jsPDF does not kern, so layout, preview and PDF all measure without it (SPEC 3.7).
        units = font.layout(text, { kern: false }).advanceWidth / font.unitsPerEm;
        cache.set(key, units);
      }
      return units * size;
    },
  };
}

/** Vertical glyph extent of a text per em: top above the baseline and bottom below it (positive down). */
export function glyphExtent(text: string, isBold: boolean): { above: number; below: number } {
  const font = isBold ? bold : regular;
  const box = font.layout(text, { kern: false }).bbox;
  return {
    above: Math.max(0, box.maxY) / font.unitsPerEm,
    below: Math.max(0, -box.minY) / font.unitsPerEm,
  };
}

/** Monospace measurer: every character is `ratio` em wide. Handy for constructed cases. */
export function createFixedMeasurer(ratio = 0.5): TextMeasurer {
  return { width: (text, size) => text.length * ratio * size };
}
