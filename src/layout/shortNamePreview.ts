// Live preview of a short name in a 3-day cell of the A3 year view (SPEC 5.5).
// A small LayoutResult, so the catalogue draws it with the same SVG renderer as the page.
import type { ImageData } from '../domain/types.ts';
import type { TextMeasurer } from './measure.ts';
import { COLORS, ROWS, SIZES, pageGeometry } from './pageSpec.ts';
import type { LayoutResult, Shape } from './shapes.ts';
import { fitSegment } from './textFit.ts';

export const PREVIEW_DAYS = 3;

export interface ShortNamePreviewInput {
  shortName: string;
  city: string;
  flag: ImageData | null;
  logo: ImageData | null;
  color: string;
}

export function layoutShortNamePreview(
  input: ShortNamePreviewInput,
  m: TextMeasurer,
): LayoutResult {
  // The year format's column; the year itself does not change the geometry.
  const g = pageGeometry('year', 2000);
  const w = g.colW;
  const h = PREVIEW_DAYS * g.rowH;
  const left = SIZES.numberZone + SIZES.textInsetLeft;
  const fit = fitSegment(
    {
      area: { x: left, y: 0, w: w - SIZES.textInsetRight - left, h },
      name: input.shortName,
      held: false,
      primary: { city: input.city.trim(), flag: input.flag, logo: input.logo },
      days: PREVIEW_DAYS,
      rowH: g.rowH,
    },
    m,
  );
  const line = { stroke: COLORS.gridLine, width: SIZES.gridLineWidth };
  const shapes: Shape[] = [{ kind: 'rect', x: 0, y: 0, w, h, fill: input.color }];
  for (let d = 0; d <= PREVIEW_DAYS; d++) {
    shapes.push({ kind: 'line', x1: 0, y1: d * g.rowH, x2: w, y2: d * g.rowH, ...line });
  }
  shapes.push({ kind: 'line', x1: 0, y1: 0, x2: 0, y2: h, ...line });
  shapes.push({ kind: 'line', x1: w, y1: 0, x2: w, y2: h, ...line });
  shapes.push(...fit.shapes);
  return {
    page: { w, h, formatId: 'year', title: '' },
    shapes,
    grid: { x: 0, y: 0, colW: w, rowH: g.rowH, rows: ROWS, months: [] },
    hits: [],
    warnings: [],
  };
}
