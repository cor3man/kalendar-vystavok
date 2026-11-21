import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import type { TextItem } from 'pdfjs-dist/types/src/display/api';
import { describe, expect, it } from 'vitest';
import { formatDMY } from '../../../src/domain/dates.ts';
import type { FormatId } from '../../../src/domain/types.ts';
import { ru } from '../../../src/i18n/ru.ts';
import { layoutCalendar } from '../../../src/layout/layout.ts';
import { FORMAT_IDS, FORMATS } from '../../../src/layout/pageSpec.ts';
import type { LayoutResult, Shape } from '../../../src/layout/shapes.ts';
import {
  mmToPt,
  pdfFileName,
  renderPdf,
  textStart,
  type PdfAssets,
} from '../../../src/render/pdf/renderPdf.ts';
import { buildSeed } from '../../../src/storage/seed.ts';
import { createFontkitMeasurer } from '../helpers/fontkitMeasurer.ts';

const MM_PER_PT = 25.4 / 72;
const fontDir = fileURLToPath(new URL('../../../src/render/fonts/', import.meta.url));
const font = (file: string): string => readFileSync(fontDir + file).toString('base64');
const fonts = { regular: font('PTSansNarrow-Regular.ttf'), bold: font('PTSansNarrow-Bold.ttf') };

/** A 1 × 1 opaque PNG; stands in for the rasterised flags (rasterising needs a browser). */
const PNG_1PX =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

const measurer = createFontkitMeasurer();
const seed = buildSeed({ currentYear: 2026, appVersion: '0.3.0', savedAt: '2026-11-21T10:00:00Z' });
const EXPORT_DATE = '2026-11-21';

function layoutFor(format: FormatId): LayoutResult {
  return layoutCalendar({ data: seed, year: 2027, format, exportDate: EXPORT_DATE, measurer });
}

function assetsFor(layout: LayoutResult): PdfAssets {
  const images = new Map<string, string>();
  for (const s of layout.shapes) if (s.kind === 'image') images.set(s.image.dataUrl, PNG_1PX);
  return { fonts, images };
}

function bytes(layout: LayoutResult, assets = assetsFor(layout)): Uint8Array {
  return new Uint8Array(renderPdf(layout, assets).output('arraybuffer'));
}

async function parse(data: Uint8Array) {
  const pdf = await getDocument({ data: data.slice(), useSystemFonts: false }).promise;
  const page = await pdf.getPage(1);
  const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = page.view;
  const content = await page.getTextContent();
  const items = content.items.filter((i): i is TextItem => 'str' in i);
  return {
    pages: pdf.numPages,
    wMm: (x1 - x0) * MM_PER_PT,
    hMm: (y1 - y0) * MM_PER_PT,
    items,
    text: items.map((i) => i.str).join(' '),
  };
}

function raw(data: Uint8Array): string {
  return Buffer.from(data).toString('latin1');
}

function count(haystack: string, needle: RegExp): number {
  return haystack.match(needle)?.length ?? 0;
}

function page(shapes: Shape[]): LayoutResult {
  return {
    page: { w: 210, h: 297, formatId: 'h1', title: '2027' },
    shapes,
    grid: { x: 0, y: 0, colW: 1, rowH: 1, rows: 31, months: [] },
    hits: [],
    warnings: [],
  };
}

describe('helpers', () => {
  it('converts mm to points', () => {
    expect(mmToPt(25.4)).toBeCloseTo(72, 9);
  });

  it.each([
    ['left', 0, { x: 50, y: 20 }],
    ['right', 0, { x: 40, y: 20 }],
    ['center', 0, { x: 45, y: 20 }],
    ['left', 90, { x: 50, y: 20 }],
    ['right', 90, { x: 50, y: 30 }],
    ['center', 90, { x: 50, y: 25 }],
  ] as const)('anchors %s text rotated %d', (align, rotate, expected) => {
    expect(textStart({ x: 50, y: 20, align, rotate }, 10)).toEqual(expected);
  });

  it('names the file after the title and format', () => {
    expect(pdfFileName(layoutFor('year').page)).toBe('Kalendar_2027_year.pdf');
    expect(pdfFileName(layoutFor('h1').page)).toBe('Kalendar_2027_h1.pdf');
    expect(pdfFileName(layoutFor('split').page)).toBe('Kalendar_2027-2028_split.pdf');
  });
});

describe.each(FORMAT_IDS)('seed 2027 in the %s format', (format) => {
  const layout = layoutFor(format);
  const data = bytes(layout);

  it('has one page of exactly the format size (3.1)', async () => {
    const pdf = await parse(data);
    expect(pdf.pages).toBe(1);
    expect(pdf.wMm).toBeCloseTo(FORMATS[format].w, 2);
    expect(pdf.hMm).toBeCloseTo(FORMATS[format].h, 2);
  });

  it('contains every text shape as real text', async () => {
    const { text } = await parse(data);
    expect(text).toContain(`${ru.updatedPrefix} ${formatDMY(EXPORT_DATE)}`);
    for (const s of layout.shapes) if (s.kind === 'text') expect(text).toContain(s.text);
  });

  it('embeds both font files', () => {
    expect(count(raw(data), /\/FontFile2/g)).toBe(2);
  });
});

describe('drawing', () => {
  it('embeds each distinct image once although several shapes use it', () => {
    const layout = layoutFor('year');
    const images = layout.shapes.filter((s) => s.kind === 'image');
    const distinct = new Set(images.map((s) => s.image.dataUrl)).size;
    expect(images.length).toBeGreaterThan(distinct); // Россия is used by several events
    // Each PNG with alpha becomes an image plus its soft mask; count the images that own a mask.
    expect(count(raw(bytes(layout)), /\/SMask \d+ 0 R/g)).toBe(distinct);
  });

  it('fails clearly when an image asset is missing', () => {
    const layout = layoutFor('year');
    expect(() => renderPdf(layout, { fonts, images: new Map() })).toThrow(/asset missing/);
  });

  it('places right-aligned text with its right end on the anchor', async () => {
    const layout = page([
      {
        kind: 'text',
        x: 100,
        y: 50,
        text: 'Москва',
        size: 3,
        bold: true,
        color: '#151515',
        rotate: 0,
        align: 'right',
      },
    ]);
    const [item] = (await parse(bytes(layout))).items;
    expect(item).toBeDefined();
    if (item === undefined) return;
    const startMm = item.transform[4] * MM_PER_PT;
    const widthMm = item.width * MM_PER_PT;
    expect(startMm + widthMm).toBeCloseTo(100, 1);
    expect(widthMm).toBeCloseTo(measurer.width('Москва', 3, true), 1);
    expect(297 - item.transform[5] * MM_PER_PT).toBeCloseTo(50, 2);
  });

  it('rotates text 90° counter-clockwise with the top end on a right anchor', async () => {
    const layout = page([
      {
        kind: 'text',
        x: 60,
        y: 80,
        text: 'Транспорт',
        size: 2,
        bold: true,
        color: '#151515',
        rotate: 90,
        align: 'right',
      },
    ]);
    const [item] = (await parse(bytes(layout))).items;
    expect(item).toBeDefined();
    if (item === undefined) return;
    const [a, b, c, d, e, f] = item.transform as [number, number, number, number, number, number];
    // PDF space is y-up: a counter-clockwise quarter turn is [0, s, −s, 0].
    expect(a).toBeCloseTo(0, 6);
    expect(b).toBeGreaterThan(0);
    expect(c).toBeLessThan(0);
    expect(d).toBeCloseTo(0, 6);
    expect(e * MM_PER_PT).toBeCloseTo(60, 2);
    const startYmm = 297 - f * MM_PER_PT;
    expect(startYmm - measurer.width('Транспорт', 2, true)).toBeCloseTo(80, 1);
  });

  it('wraps clipped text and paths in a clip that is restored afterwards', () => {
    const clip = { x: 10, y: 10, w: 5, h: 5 };
    const layout = page([
      {
        kind: 'text',
        x: 12,
        y: 14,
        text: 'ТрансРоссия',
        size: 1.5,
        bold: true,
        color: '#151515',
        rotate: 90,
        align: 'right',
        clip,
      },
      {
        kind: 'path',
        points: [
          { x: 11, y: 12 },
          { x: 12, y: 13 },
          { x: 14, y: 11 },
        ],
        stroke: '#151515',
        width: 0.2,
        clip,
      },
      { kind: 'path', points: [], stroke: '#151515', width: 0.2 },
    ]);
    const ops = pageOperators(renderPdf(layout, { fonts, images: new Map() }));
    expect(count(ops, /^W$/gm)).toBe(2); // one clip per clipped shape
    expect(count(ops, /^W\nn$/gm)).toBe(2); // the clip path is discarded, not painted
    expect(count(ops, /^q$/gm)).toBe(count(ops, /^Q$/gm));
    expect(ops).toMatch(/^1 J$/m); // round caps on the check mark
    expect(ops).toMatch(/^1 j$/m); // round joins
  });
});

/** Content operators of page 1 as jsPDF keeps them before compressing the stream. */
function pageOperators(doc: ReturnType<typeof renderPdf>): string {
  const internal = doc.internal as unknown as { pages: (string[] | undefined)[] };
  return (internal.pages[1] ?? []).join('\n');
}
