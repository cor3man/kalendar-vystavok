// Event content inside a segment: wrapping, size fitting and the fallback order (SPEC 3.6).
import type { ImageData } from '../domain/types.ts';
import { FONT_METRICS, type TextMeasurer } from './measure.ts';
import { COLORS } from './pageSpec.ts';
import type { PathShape, Rect, Shape, TextShape } from './shapes.ts';

export const FIT = {
  nameTop: 0.6,
  nameMax: 3.4,
  nameMin: 2.1,
  lineHeight: 1.15,
  maxLines: 4,
  logoMaxRows: 2.2,
  logoMin: 2.5,
  flagMax: 3.4,
  flagRowRatio: 0.42,
  flagMaxAspect: 2,
  flagGap: 1.0,
  cityMax: 3.0,
  cityMin: 1.6,
  verticalMax: 3.4,
  verticalMin: 1.5,
  /** Free space kept at the bottom of a segment and around the logo (not in the spec; visual). */
  bottomPad: 0.4,
} as const;

/**
 * Held mark (SPEC 3.6): a check mark drawn as a vector path before the name, as tall as the
 * name's cap height. The font has no check-mark glyph, so the mark is geometry, not text.
 */
export const HELD_MARK = {
  /** Mark width as a share of the cap height. */
  widthRatio: 0.9,
  /** Stroke width per em of the name size. */
  strokeRatio: 0.12,
} as const;

export type FitStep = 'horizontal' | 'horizontalNoLogo' | 'vertical' | 'verticalNoCity' | 'clipped';

export interface PrimaryContent {
  city: string;
  flag: ImageData | null;
  logo: ImageData | null;
}

export interface FitInput {
  /** Text area of the segment (lane minus number zone and insets), full segment height. */
  area: Rect;
  /** Short name of the exhibition ('\n' = forced break). */
  name: string;
  held: boolean;
  /** City, flag and logo; only for the primary segment, null otherwise. */
  primary: PrimaryContent | null;
  days: number;
  rowH: number;
}

export interface FitResult {
  step: FitStep;
  shapes: Shape[];
}

/** Sizes from max down to min in 0.1 steps, without float drift. */
export function sizeSteps(max: number, min: number): number[] {
  const out: number[] = [];
  for (let t = Math.round(max * 10); t >= Math.round(min * 10); t--) out.push(t / 10);
  return out;
}

function markBoxWidth(size: number): number {
  return HELD_MARK.widthRatio * FONT_METRICS.capHeight * size;
}

/** Space the held mark takes before the first line: the mark plus one space of the name font. */
export function heldMarkWidth(size: number, m: TextMeasurer): number {
  return markBoxWidth(size) + m.width(' ', size, true);
}

/** Maps a point of the mark's local frame (u along the reading direction, v up from the baseline) to the page. */
type ToPage = (u: number, v: number) => { x: number; y: number };

/** The check mark as a polyline whose stroke stays inside the mark box (width × cap height). */
function heldMark(size: number, toPage: ToPage, clip: Rect | null): PathShape {
  const sw = HELD_MARK.strokeRatio * size;
  const i = sw / 2;
  const iw = markBoxWidth(size) - sw;
  const ih = FONT_METRICS.capHeight * size - sw;
  const points = [toPage(i, i + 0.5 * ih), toPage(i + 0.38 * iw, i), toPage(i + iw, i + ih)];
  return {
    kind: 'path',
    points,
    stroke: COLORS.eventText,
    width: sw,
    ...(clip === null ? {} : { clip }),
  };
}

/**
 * Greedy word wrap. Breaks only at regular spaces and at '\n'.
 * `firstIndent` is reserved before the first line (the held mark), so the mark always shares
 * its line with the first word.
 * Returns null when a word is wider than its line or more than maxLines lines are needed,
 * unless `loose` is set (then lines may overflow and are cut at maxLines).
 */
export function wrapText(
  text: string,
  size: number,
  bold: boolean,
  maxWidth: number,
  measurer: TextMeasurer,
  loose = false,
  firstIndent = 0,
): string[] | null {
  const lines: string[] = [];
  const fits = (s: string): boolean =>
    measurer.width(s, size, bold) + (lines.length === 0 ? firstIndent : 0) <= maxWidth + 1e-9;
  for (const paragraph of text.split('\n')) {
    const words = paragraph.split(' ').filter((w) => w !== '');
    let line = '';
    for (const word of words) {
      if (line === '') {
        if (!fits(word) && !loose) return null;
        line = word;
        continue;
      }
      const candidate = `${line} ${word}`;
      if (fits(candidate)) {
        line = candidate;
      } else {
        lines.push(line);
        if (!fits(word) && !loose) return null;
        line = word;
      }
    }
    lines.push(line);
  }
  if (lines.length > FIT.maxLines) return loose ? lines.slice(0, FIT.maxLines) : null;
  return lines;
}

function flagSize(flag: ImageData, rowH: number): { w: number; h: number } {
  const h = Math.min(FIT.flagMax, FIT.flagRowRatio * rowH);
  const aspect = flag.height > 0 ? flag.width / flag.height : 1;
  return { w: Math.min(h * aspect, FIT.flagMaxAspect * h), h };
}

function textShape(
  x: number,
  y: number,
  text: string,
  size: number,
  align: TextShape['align'],
  rotate: 0 | 90 = 0,
): TextShape {
  return { kind: 'text', x, y, text, size, bold: true, color: COLORS.eventText, rotate, align };
}

function capBaseline(top: number, size: number): number {
  return top + FONT_METRICS.capHeight * size;
}

/** Largest size in [max, min] at which `text` fits `width`, or null. */
function fitSingleLine(
  text: string,
  width: number,
  max: number,
  min: number,
  m: TextMeasurer,
): number | null {
  for (const s of sizeSteps(max, min)) if (m.width(text, s, true) <= width + 1e-9) return s;
  return null;
}

/** Logo centred in [top, bottom] of the text area, or null when less than the minimum height fits. */
function placeLogo(
  logo: ImageData,
  area: Rect,
  top: number,
  bottom: number,
  rowH: number,
): Shape | null {
  const space = bottom - top - 2 * FIT.bottomPad;
  const aspect = logo.height > 0 ? logo.width / logo.height : 1;
  let h = Math.min(FIT.logoMaxRows * rowH, space);
  let w = h * aspect;
  if (w > area.w) {
    w = area.w;
    h = w / aspect;
  }
  if (h < FIT.logoMin) return null;
  return {
    kind: 'image',
    x: area.x + (area.w - w) / 2,
    y: top + (bottom - top - h) / 2,
    w,
    h,
    image: logo,
    border: false,
  };
}

function tryHorizontal(
  input: FitInput,
  size: number,
  withLogo: boolean,
  m: TextMeasurer,
): Shape[] | null {
  const { area, primary, days, rowH } = input;
  const right = area.x + area.w;
  const bottom = area.y + area.h;
  const lineH = FIT.lineHeight * size;
  const name = input.name.trim();
  const indent = input.held ? heldMarkWidth(size, m) : 0;
  const flag = primary?.flag ?? null;
  const fs = flag === null ? null : flagSize(flag, rowH);
  const shapes: Shape[] = [];

  let nameRight = right;
  let nameLimit: number; // the name must end above this y
  if (days === 1) {
    // Name and flag share the row; city omitted.
    if (flag !== null && fs !== null) {
      nameRight = right - fs.w - FIT.flagGap;
      shapes.push({
        kind: 'image',
        x: right - fs.w,
        y: area.y + (area.h - fs.h) / 2,
        w: fs.w,
        h: fs.h,
        image: flag,
        border: true,
      });
    }
    nameLimit = bottom - FIT.bottomPad;
  } else if (primary !== null && (primary.city !== '' || flag !== null)) {
    // Bottom row: flag at the right edge, city right-aligned left of it.
    const rowTop = bottom - rowH;
    const rowCenter = rowTop + rowH / 2;
    let cityRight = right;
    if (flag !== null && fs !== null) {
      shapes.push({
        kind: 'image',
        x: right - fs.w,
        y: rowCenter - fs.h / 2,
        w: fs.w,
        h: fs.h,
        image: flag,
        border: true,
      });
      cityRight = right - fs.w - FIT.flagGap;
    }
    if (primary.city !== '') {
      const cs = fitSingleLine(primary.city, cityRight - area.x, FIT.cityMax, FIT.cityMin, m);
      if (cs === null) return null;
      shapes.push(
        textShape(
          cityRight,
          rowCenter + (FONT_METRICS.capHeight * cs) / 2,
          primary.city,
          cs,
          'right',
        ),
      );
    }
    nameLimit = rowTop;
  } else {
    nameLimit = bottom - FIT.bottomPad;
  }

  const lines = wrapText(name, size, true, nameRight - area.x, m, false, indent);
  if (lines === null) return null;
  const nameTop = area.y + FIT.nameTop;
  const nameBottom = nameTop + lines.length * lineH;
  if (nameBottom > nameLimit + 1e-9) return null;
  lines.forEach((line, i) =>
    shapes.push(textShape(nameRight, capBaseline(nameTop + i * lineH, size), line, size, 'right')),
  );

  if (input.held) {
    const markStart = nameRight - m.width(lines[0] ?? '', size, true) - indent;
    const baseline = capBaseline(nameTop, size);
    shapes.push(heldMark(size, (u, v) => ({ x: markStart + u, y: baseline - v }), null));
  }

  const logo = primary?.logo ?? null;
  if (withLogo && logo !== null) {
    const logoShape = placeLogo(logo, area, nameBottom, nameLimit, rowH);
    if (logoShape === null) return null;
    shapes.push(logoShape);
  }
  return shapes;
}

/** Vertical layout: lines rotated 90° CCW, stacked left to right, each ending at the segment top. */
function verticalShapes(
  input: FitInput,
  size: number,
  withCity: boolean,
  m: TextMeasurer,
  loose: boolean,
): Shape[] | null {
  const { area, primary, rowH } = input;
  const right = area.x + area.w;
  const bottom = area.y + area.h;
  const lineH = FIT.lineHeight * size;
  const flag = primary?.flag ?? null;
  const fs = flag === null ? null : flagSize(flag, rowH);
  const length = area.h - FIT.nameTop - FIT.bottomPad - (fs === null ? 0 : fs.h + FIT.bottomPad);

  const indent = input.held ? heldMarkWidth(size, m) : 0;
  const lines = wrapText(input.name.trim(), size, true, length, m, loose, indent);
  if (lines === null) return null;
  const firstLine = lines[0] ?? '';
  const city = withCity ? (primary?.city ?? '') : '';
  if (city !== '') {
    if (m.width(city, size, true) > length + 1e-9) return null;
    lines.push(city);
  }
  if (!loose && lines.length * lineH > area.w + 1e-9) return null;

  const clip = loose ? { clip: { ...area } } : {};
  const baselineX = (i: number): number =>
    area.x + i * lineH + (lineH + FONT_METRICS.capHeight * size) / 2;
  const top = area.y + FIT.nameTop;
  const shapes: Shape[] = lines.map((line, i) => ({
    ...textShape(baselineX(i), top, line, size, 'right', 90),
    ...clip,
  }));
  if (input.held) {
    // Rotated 90° CCW: reading runs up the page (−y) and "up" points left (−x).
    const textStart = top + m.width(firstLine, size, true);
    const bx = baselineX(0);
    const markClip = loose ? { ...area } : null;
    shapes.push(heldMark(size, (u, v) => ({ x: bx - v, y: textStart + indent - u }), markClip));
  }
  if (flag !== null && fs !== null) {
    shapes.push({
      kind: 'image',
      x: right - fs.w,
      y: bottom - FIT.bottomPad - fs.h,
      w: fs.w,
      h: fs.h,
      image: flag,
      border: true,
    });
  }
  return shapes;
}

/** Lays out one segment's content following SPEC 3.6, including the fallback order. */
export function fitSegment(input: FitInput, m: TextMeasurer): FitResult {
  const hasLogo = (input.primary?.logo ?? null) !== null;
  if (hasLogo) {
    for (const s of sizeSteps(FIT.nameMax, FIT.nameMin)) {
      const shapes = tryHorizontal(input, s, true, m);
      if (shapes !== null) return { step: 'horizontal', shapes };
    }
  }
  for (const s of sizeSteps(FIT.nameMax, FIT.nameMin)) {
    const shapes = tryHorizontal(input, s, false, m);
    if (shapes !== null) return { step: hasLogo ? 'horizontalNoLogo' : 'horizontal', shapes };
  }
  const hasCity = input.primary !== null && input.primary.city !== '';
  if (hasCity) {
    for (const s of sizeSteps(FIT.verticalMax, FIT.verticalMin)) {
      const shapes = verticalShapes(input, s, true, m, false);
      if (shapes !== null) return { step: 'vertical', shapes };
    }
  }
  for (const s of sizeSteps(FIT.verticalMax, FIT.verticalMin)) {
    const shapes = verticalShapes(input, s, false, m, false);
    if (shapes !== null) return { step: hasCity ? 'verticalNoCity' : 'vertical', shapes };
  }
  // Step 4: the loose layout always produces shapes.
  return { step: 'clipped', shapes: verticalShapes(input, FIT.verticalMin, false, m, true) ?? [] };
}
