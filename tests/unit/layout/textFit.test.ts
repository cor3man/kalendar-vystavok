import { describe, expect, it } from 'vitest';
import {
  displayName,
  fitSegment,
  HELD_PREFIX,
  sizeSteps,
  wrapText,
  type FitInput,
} from '../../../src/layout/textFit.ts';
import type { ImageShape, Shape, TextShape } from '../../../src/layout/shapes.ts';
import { createFixedMeasurer, createFontkitMeasurer } from '../helpers/fontkitMeasurer.ts';

const fixed = createFixedMeasurer(0.5);
const fontkit = createFontkitMeasurer();
const flag = { dataUrl: 'data:image/svg+xml;base64,', width: 160, height: 120 };
const logo = { dataUrl: 'data:image/png;base64,', width: 200, height: 100 };
const ROW = 8;

function input(over: Partial<FitInput> & { w: number; days: number }): FitInput {
  const { w, days, ...rest } = over;
  return {
    area: { x: 0, y: 0, w, h: days * ROW },
    name: 'ABCDEFGH',
    held: false,
    primary: { city: 'City', flag, logo: null },
    days,
    rowH: ROW,
    ...rest,
  };
}

const texts = (shapes: Shape[]): TextShape[] =>
  shapes.filter((s): s is TextShape => s.kind === 'text');
const images = (shapes: Shape[]): ImageShape[] =>
  shapes.filter((s): s is ImageShape => s.kind === 'image');

describe('sizeSteps', () => {
  it('steps by 0.1 without float drift', () => {
    expect(sizeSteps(3.4, 3.0)).toEqual([3.4, 3.3, 3.2, 3.1, 3.0]);
    expect(sizeSteps(3.4, 2.1)).toHaveLength(14);
  });
});

describe('wrapText', () => {
  it('wraps greedily at spaces', () => {
    expect(wrapText('aa bb cc', 1, true, 2.5, fixed)).toEqual(['aa bb', 'cc']);
  });

  it('respects manual line breaks even when the text would fit on one line', () => {
    expect(wrapText('aa\nbb', 1, true, 100, fixed)).toEqual(['aa', 'bb']);
  });

  it('fails on a word wider than the line or on more than 4 lines', () => {
    expect(wrapText('abcdef', 1, true, 2, fixed)).toBeNull();
    expect(wrapText('a b c d e', 1, true, 0.5, fixed)).toBeNull();
    expect(wrapText('a\nb\nc\nd', 1, true, 10, fixed)).toHaveLength(4);
  });

  it('in loose mode overflows instead of failing and cuts at 4 lines', () => {
    expect(wrapText('abcdef gh', 1, true, 2, fixed, true)).toEqual(['abcdef', 'gh']);
    expect(wrapText('a b c d e', 1, true, 0.5, fixed, true)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('never leaves the held mark alone on a line', () => {
    const name = displayName('Transport logistic', true);
    expect(name.startsWith(HELD_PREFIX)).toBe(true);
    for (const width of [5, 8, 12, 20, 40]) {
      const lines = wrapText(name, 3, true, width, fontkit, true) ?? [];
      expect(lines[0]).not.toBe('✓');
      expect(lines[0]?.startsWith(HELD_PREFIX)).toBe(true);
    }
  });
});

describe('fitSegment: horizontal layout', () => {
  it('fits name, city and flag at the largest size', () => {
    const r = fitSegment(input({ w: 20, days: 3, name: 'Abc' }), fixed);
    expect(r.step).toBe('horizontal');
    const [city, name] = texts(r.shapes);
    expect(name).toMatchObject({
      text: 'Abc',
      size: 3.4,
      align: 'right',
      bold: true,
      rotate: 0,
      x: 20,
    });
    expect(city).toMatchObject({ text: 'City', size: 3.0, align: 'right' });
    const [f] = images(r.shapes);
    expect(f).toMatchObject({ border: true });
    // Flag at the right edge of the bottom row; city 1.0 to its left.
    expect((f?.x ?? 0) + (f?.w ?? 0)).toBeCloseTo(20);
    expect(city?.x).toBeCloseTo((f?.x ?? 0) - 1.0);
    expect(f?.h).toBeCloseTo(Math.min(3.4, 0.42 * ROW));
  });

  it('places a logo centred below the name when there is room', () => {
    const r = fitSegment(
      input({ w: 20, days: 4, name: 'Abc', primary: { city: 'City', flag, logo } }),
      fixed,
    );
    expect(r.step).toBe('horizontal');
    const lg = images(r.shapes).find((i) => !i.border);
    expect(lg).toBeDefined();
    expect(lg?.h).toBeGreaterThanOrEqual(2.5);
    expect(lg?.h).toBeLessThanOrEqual(2.2 * ROW);
    expect((lg?.x ?? 0) + (lg?.w ?? 0) / 2).toBeCloseTo(10);
  });

  it('step 1: drops the logo when no size leaves room for it', () => {
    const r = fitSegment(
      input({ w: 20, days: 2, name: 'A\nB', primary: { city: 'City', flag, logo } }),
      fixed,
    );
    expect(r.step).toBe('horizontalNoLogo');
    expect(images(r.shapes).filter((i) => !i.border)).toHaveLength(0);
    expect(texts(r.shapes).find((t) => t.text === 'A')?.size).toBe(3.2);
  });

  it('one-day segment: name and flag share the row, no city', () => {
    const r = fitSegment(input({ w: 20, days: 1, name: 'Abc' }), fixed);
    expect(r.step).toBe('horizontal');
    expect(texts(r.shapes).map((t) => t.text)).toEqual(['Abc']);
    const [f] = images(r.shapes);
    expect((f?.y ?? 0) + (f?.h ?? 0) / 2).toBeCloseTo(ROW / 2);
    expect(texts(r.shapes)[0]?.x).toBeCloseTo((f?.x ?? 0) - 1.0);
  });

  it('non-primary segment shows the name only', () => {
    const r = fitSegment(input({ w: 20, days: 2, name: 'Abc', primary: null }), fixed);
    expect(r.shapes.map((s) => s.kind)).toEqual(['text']);
  });

  it('respects manual line breaks', () => {
    const r = fitSegment(input({ w: 30, days: 3, name: 'Ab\nCd', primary: null }), fixed);
    expect(texts(r.shapes).map((t) => t.text)).toEqual(['Ab', 'Cd']);
  });

  it('prefixes held events with the check mark', () => {
    const r = fitSegment(input({ w: 30, days: 3, name: 'Abc', held: true, primary: null }), fixed);
    expect(texts(r.shapes)[0]?.text).toBe(`${HELD_PREFIX}Abc`);
  });
});

describe('fitSegment: fallback order', () => {
  it('step 2: vertical with the city', () => {
    const r = fitSegment(input({ w: 6, days: 3 }), fixed);
    expect(r.step).toBe('vertical');
    const t = texts(r.shapes);
    expect(t.map((s) => s.text)).toEqual(['ABCDEFGH', 'City']);
    expect(t.every((s) => s.rotate === 90 && s.align === 'right' && s.size === 2.6)).toBe(true);
    // Lines stacked left to right, each ending at the segment top.
    expect((t[0]?.x ?? 0) < (t[1]?.x ?? 0)).toBe(true);
    expect(t.every((s) => s.y === 0.6)).toBe(true);
    // The flag stays horizontal at the bottom right.
    const [f] = images(r.shapes);
    expect((f?.x ?? 0) + (f?.w ?? 0)).toBeCloseTo(6);
    expect((f?.y ?? 0) + (f?.h ?? 0)).toBeCloseTo(3 * ROW - 0.4);
  });

  it('step 3: vertical without the city', () => {
    const r = fitSegment(input({ w: 3, days: 3 }), fixed);
    expect(r.step).toBe('verticalNoCity');
    expect(texts(r.shapes).map((s) => s.text)).toEqual(['ABCDEFGH']);
    expect(images(r.shapes)).toHaveLength(1);
  });

  it('step 4: name at 1.5, clipped to the text area; the flag is kept', () => {
    const r = fitSegment(input({ w: 1.5, days: 3 }), fixed);
    expect(r.step).toBe('clipped');
    const [t] = texts(r.shapes);
    expect(t).toMatchObject({ size: 1.5, rotate: 90, clip: { x: 0, y: 0, w: 1.5, h: 24 } });
    expect(images(r.shapes)).toHaveLength(1);
  });

  it('without a city, vertical is reported as plain vertical', () => {
    const r = fitSegment(
      input({ w: 3, days: 3, primary: { city: '', flag: null, logo: null } }),
      fixed,
    );
    expect(r.step).toBe('vertical');
  });

  it('fails horizontal when the city cannot fit at its minimum size', () => {
    const r = fitSegment(
      input({ w: 9, days: 3, name: 'A', primary: { city: 'Verylongcityname', flag, logo: null } }),
      fixed,
    );
    expect(r.step).not.toBe('horizontal');
  });
});
