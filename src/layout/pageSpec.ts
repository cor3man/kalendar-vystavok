// Page formats and geometry (SPEC 3.1–3.4). All sizes in mm.
import type { MonthRef } from '../domain/segments.ts';
import type { FormatId } from '../domain/types.ts';
import { FONT_METRICS } from './measure.ts';
import type { Rect } from './shapes.ts';

export const MARGIN = 8;
export const ROWS = 31;

export const COLORS = {
  magenta: '#E6007E',
  text: '#151515',
  updated: '#777777',
  headerFill: '#2B2B2B',
  headerText: '#FFFFFF',
  gridLine: '#2A1F8F',
  backgroundYear: '#E2E2E2',
  holidayFill: '#F9C3CB',
  holidayLabel: '#E3311A',
  eventText: '#151515',
  flagBorder: '#808080',
} as const;

export const SIZES = {
  updated: 3,
  headerBand: 8,
  gridLineWidth: 0.2,
  dayNumber: 2.7,
  weekday: 1.5,
  dayTextLeft: 1.3,
  /** Gap between the day number and the weekday abbreviation (not in the spec; visual). */
  weekdayGap: 0.4,
  numberZone: 7.4,
  holidayLabelMax: 3.3,
  holidayLabelMin: 1.6,
  /** Text area insets of a segment (3.6). */
  textInsetLeft: 0.8,
  textInsetRight: 1.0,
  flagBorderWidth: 0.08,
} as const;

/**
 * Title block geometry, taken from the reference PDF (not fixed by the spec):
 * the title's cap tops sit on the top margin and the month band starts 1.25 × title size below it.
 */
export const TITLE_BLOCK_FACTOR = 1.25;

/** Small "Y+1" label above the January column of `split` (size and gap chosen; not in the reference). */
export const NEXT_YEAR_LABEL = { size: 4, gapAboveBand: 1.2 } as const;

export interface FormatSpec {
  id: FormatId;
  paper: 'A3' | 'A4';
  w: number;
  h: number;
  titleSize: number;
  monthNameSize: number;
}

export const FORMATS: Record<FormatId, FormatSpec> = {
  year: { id: 'year', paper: 'A3', w: 420, h: 297, titleSize: 14, monthNameSize: 4.6 },
  h1: { id: 'h1', paper: 'A4', w: 210, h: 297, titleSize: 11, monthNameSize: 3.6 },
  h2: { id: 'h2', paper: 'A4', w: 210, h: 297, titleSize: 11, monthNameSize: 3.6 },
  split: { id: 'split', paper: 'A3', w: 420, h: 297, titleSize: 14, monthNameSize: 4.6 },
};

export const FORMAT_IDS: readonly FormatId[] = ['year', 'h1', 'h2', 'split'];

function monthRange(year: number, from: number, to: number): MonthRef[] {
  const out: MonthRef[] = [];
  for (let m = from; m <= to; m++) out.push({ year, month: m });
  return out;
}

/** Month columns of a page (3.1). */
export function pageMonths(format: FormatId, year: number): MonthRef[] {
  switch (format) {
    case 'year':
      return monthRange(year, 1, 12);
    case 'h1':
      return monthRange(year, 1, 6);
    case 'h2':
      return monthRange(year, 7, 12);
    case 'split':
      return [...monthRange(year, 7, 12), ...monthRange(year + 1, 1, 6)];
  }
}

/** Page title (3.1); `split` uses an en dash: "2027–2028". */
export function pageTitle(format: FormatId, year: number): string {
  return format === 'split' ? `${String(year)}–${String(year + 1)}` : String(year);
}

export interface PageGeometry {
  spec: FormatSpec;
  months: MonthRef[];
  titleBaseline: number;
  band: Rect;
  grid: Rect;
  colW: number;
  rowH: number;
}

export function pageGeometry(format: FormatId, year: number): PageGeometry {
  const spec = FORMATS[format];
  const months = pageMonths(format, year);
  const bandY = MARGIN + spec.titleSize * TITLE_BLOCK_FACTOR;
  const gridY = bandY + SIZES.headerBand;
  const gridW = spec.w - 2 * MARGIN;
  const gridH = spec.h - MARGIN - gridY;
  return {
    spec,
    months,
    titleBaseline: MARGIN + spec.titleSize * FONT_METRICS.capHeight,
    band: { x: MARGIN, y: bandY, w: gridW, h: SIZES.headerBand },
    grid: { x: MARGIN, y: gridY, w: gridW, h: gridH },
    colW: gridW / months.length,
    rowH: gridH / ROWS,
  };
}
