import { describe, expect, it } from 'vitest';
import { eventAt, rangeRects } from '../../../src/layout/hitTest.ts';
import { layoutCalendar } from '../../../src/layout/layout.ts';
import { pageGeometry, SIZES } from '../../../src/layout/pageSpec.ts';
import type { TextShape } from '../../../src/layout/shapes.ts';
import { layoutShortNamePreview, PREVIEW_DAYS } from '../../../src/layout/shortNamePreview.ts';
import { buildSeed } from '../../../src/storage/seed.ts';
import { createFontkitMeasurer } from '../helpers/fontkitMeasurer.ts';

const measurer = createFontkitMeasurer();

describe('eventAt', () => {
  const hits = [
    { eventId: 'a', x: 0, y: 0, w: 10, h: 10 },
    { eventId: 'b', x: 5, y: 5, w: 10, h: 10 },
  ];

  it('returns the topmost hit under the point, or null', () => {
    expect(eventAt(hits, 1, 1)).toBe('a');
    expect(eventAt(hits, 6, 6)).toBe('b');
    expect(eventAt(hits, 15, 15)).toBeNull();
    expect(eventAt([], 0, 0)).toBeNull();
  });

  it('finds every seed event at the centre of its hit rectangles', () => {
    const seed = buildSeed({ currentYear: 2027, appVersion: '0', savedAt: '' });
    const layout = layoutCalendar({
      data: seed,
      year: 2027,
      format: 'year',
      exportDate: '2027-01-01',
      measurer,
    });
    for (const h of layout.hits)
      expect(eventAt(layout.hits, h.x + h.w / 2, h.y + h.h / 2)).toBe(h.eventId);
  });
});

describe('rangeRects', () => {
  it('covers a range across a month boundary, in either order', () => {
    const g = pageGeometry('year', 2027);
    const grid = {
      x: g.grid.x,
      y: g.grid.y,
      colW: g.colW,
      rowH: g.rowH,
      rows: 31 as const,
      months: g.months,
    };
    const rects = rangeRects(grid, '2027-04-02', '2027-03-31');
    expect(rects).toEqual([
      { x: g.grid.x + 2 * g.colW, y: g.grid.y + 30 * g.rowH, w: g.colW, h: g.rowH },
      { x: g.grid.x + 3 * g.colW, y: g.grid.y, w: g.colW, h: 2 * g.rowH },
    ]);
    expect(rangeRects(grid, '2030-01-01', '2030-01-02')).toEqual([]);
  });
});

describe('layoutShortNamePreview', () => {
  const input = {
    shortName: 'Транспорт\nи Логистика',
    city: 'Москва',
    flag: null,
    logo: null,
    color: '#B3A7E0',
  };

  it('is a 3-day cell of the A3 year column with the name and city', () => {
    const g = pageGeometry('year', 2027);
    const result = layoutShortNamePreview(input, measurer);
    expect(result.page.w).toBeCloseTo(g.colW);
    expect(result.page.h).toBeCloseTo(PREVIEW_DAYS * g.rowH);
    const texts = result.shapes.filter((s): s is TextShape => s.kind === 'text').map((s) => s.text);
    expect(texts.sort()).toEqual(['Москва', 'Транспорт', 'и Логистика'].sort());
    expect(result.shapes[0]).toMatchObject({ kind: 'rect', fill: '#B3A7E0' });
  });

  it('keeps text out of the number zone', () => {
    const result = layoutShortNamePreview(
      { ...input, shortName: 'A very long name to wrap' },
      measurer,
    );
    for (const s of result.shapes) {
      if (s.kind === 'text' && s.rotate === 0 && s.align === 'right') {
        expect(s.x - measurer.width(s.text, s.size, s.bold)).toBeGreaterThanOrEqual(
          SIZES.numberZone - 1e-9,
        );
      }
    }
  });
});
