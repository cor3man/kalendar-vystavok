import { describe, expect, it } from 'vitest';
import { dayAt, layoutCalendar, type LayoutInput } from '../../../src/layout/layout.ts';
import {
  COLORS,
  FORMAT_IDS,
  FORMATS,
  MARGIN,
  pageGeometry,
  pageMonths,
  pageTitle,
  SIZES,
  WEEKEND_TINTS,
} from '../../../src/layout/pageSpec.ts';
import { daysInMonth, toISO, weekday } from '../../../src/domain/dates.ts';
import type { LayoutResult, Shape, TextShape } from '../../../src/layout/shapes.ts';
import type { DataFile, Event, FormatId } from '../../../src/domain/types.ts';
import { buildSeed } from '../../../src/storage/seed.ts';
import { ru } from '../../../src/i18n/ru.ts';
import { createFontkitMeasurer, glyphExtent } from '../helpers/fontkitMeasurer.ts';

const measurer = createFontkitMeasurer();
const seed = buildSeed({
  currentYear: 2026,
  appVersion: '0.2.0',
  savedAt: '2026-11-20T10:00:00.000Z',
});

function run(over: Partial<LayoutInput> = {}): LayoutResult {
  return layoutCalendar({
    data: seed,
    year: 2027,
    format: 'year',
    exportDate: '2026-11-20',
    measurer,
    ...over,
  });
}

function withEvents(events: Event[], base: DataFile = seed): DataFile {
  return { ...base, events };
}

function event(id: string, start: string, end: string, over: Partial<Event> = {}): Event {
  return {
    id,
    exhibitionId: 'ex-transrossiya',
    start,
    end,
    city: 'X',
    countryId: 'ru',
    color: '#B3A7E0',
    held: false,
    note: '',
    ...over,
  };
}

const texts = (r: LayoutResult): TextShape[] =>
  r.shapes.filter((s): s is TextShape => s.kind === 'text');

/** Horizontal extent of a text shape (rotated text: its line band). */
function textBounds(t: TextShape): { left: number; right: number; top: number; bottom: number } {
  if (t.rotate === 90) {
    const len = measurer.width(t.text, t.size, t.bold);
    return { left: t.x - t.size, right: t.x + 0.3 * t.size, top: t.y, bottom: t.y + len };
  }
  const w = measurer.width(t.text, t.size, t.bold);
  const left = t.align === 'left' ? t.x : t.align === 'right' ? t.x - w : t.x - w / 2;
  const ext = glyphExtent(t.text, t.bold);
  return { left, right: left + w, top: t.y - ext.above * t.size, bottom: t.y + ext.below * t.size };
}

function shapeBounds(s: Shape): { left: number; right: number; top: number; bottom: number } {
  switch (s.kind) {
    case 'rect':
    case 'image':
      return { left: s.x, right: s.x + s.w, top: s.y, bottom: s.y + s.h };
    case 'line':
      return {
        left: Math.min(s.x1, s.x2),
        right: Math.max(s.x1, s.x2),
        top: Math.min(s.y1, s.y2),
        bottom: Math.max(s.y1, s.y2),
      };
    case 'text':
      return textBounds(s);
    case 'path': {
      const xs = s.points.map((p) => p.x);
      const ys = s.points.map((p) => p.y);
      const half = s.width / 2;
      return {
        left: Math.min(...xs) - half,
        right: Math.max(...xs) + half,
        top: Math.min(...ys) - half,
        bottom: Math.max(...ys) + half,
      };
    }
  }
}

/** The seed with every event marked as held, so the check mark is laid out too. */
const heldSeed: DataFile = { ...seed, events: seed.events.map((e) => ({ ...e, held: true })) };
const datasets = [
  ['seed', seed],
  ['held seed', heldSeed],
] as const;
const cases = FORMAT_IDS.flatMap((f) => datasets.map(([name, data]) => [f, name, data] as const));

describe('pageSpec', () => {
  it('defines the four formats of 3.1', () => {
    expect(FORMAT_IDS.map((f) => [FORMATS[f].w, FORMATS[f].h, pageMonths(f, 2027).length])).toEqual(
      [
        [420, 297, 12],
        [210, 297, 6],
        [210, 297, 6],
        [420, 297, 12],
      ],
    );
    expect(pageMonths('h2', 2027)[0]).toEqual({ year: 2027, month: 7 });
    expect(pageMonths('split', 2027).map((m) => `${String(m.year)}-${String(m.month)}`)).toEqual([
      '2027-7',
      '2027-8',
      '2027-9',
      '2027-10',
      '2027-11',
      '2027-12',
      '2028-1',
      '2028-2',
      '2028-3',
      '2028-4',
      '2028-5',
      '2028-6',
    ]);
    expect(pageTitle('split', 2027)).toBe('2027–2028');
    expect(pageTitle('h1', 2027)).toBe('2027');
  });

  it('fills the page inside the 8 mm margin with a 31-row grid', () => {
    for (const f of FORMAT_IDS) {
      const g = pageGeometry(f, 2027);
      expect(g.grid.x).toBe(MARGIN);
      expect(g.grid.x + g.grid.w).toBeCloseTo(g.spec.w - MARGIN);
      expect(g.grid.y + g.grid.h).toBeCloseTo(g.spec.h - MARGIN);
      expect(g.band.h).toBe(8);
      expect(g.band.y + g.band.h).toBeCloseTo(g.grid.y);
      expect(g.rowH * 31).toBeCloseTo(g.grid.h);
    }
  });
});

describe('layoutCalendar invariants', () => {
  it.each(cases)('%s, %s: all shapes inside the page', (format: FormatId, _name, data) => {
    const r = run({ format, data });
    for (const s of r.shapes) {
      const b = shapeBounds(s);
      expect(b.left).toBeGreaterThanOrEqual(-1e-6);
      expect(b.top).toBeGreaterThanOrEqual(-1e-6);
      expect(b.right).toBeLessThanOrEqual(r.page.w + 1e-6);
      expect(b.bottom).toBeLessThanOrEqual(r.page.h + 1e-6);
    }
  });

  it.each(cases)('%s, %s: no event text inside a number zone', (format: FormatId, _name, data) => {
    const r = run({ format, data });
    const { grid } = r;
    // Event content is what disappears when the same page is laid out without events.
    const empty = new Set(
      run({ format, data: withEvents([], data) }).shapes.map((t) => JSON.stringify(t)),
    );
    const eventContent = r.shapes.filter(
      (s) => (s.kind === 'text' || s.kind === 'path') && !empty.has(JSON.stringify(s)),
    );
    expect(eventContent.length).toBeGreaterThan(0);
    if (data === heldSeed) expect(eventContent.some((s) => s.kind === 'path')).toBe(true);
    for (const t of eventContent) {
      const b = shapeBounds(t);
      const column = Math.floor((b.left - grid.x) / grid.colW);
      expect(b.left - (grid.x + column * grid.colW)).toBeGreaterThanOrEqual(
        SIZES.numberZone - 1e-6,
      );
    }
  });

  it('gives identical output for the same input', () => {
    expect(run({ format: 'split' })).toEqual(run({ format: 'split' }));
  });

  it('draws grid lines above all fills and the background year above the weekend tint', () => {
    const r = run();
    const firstLine = r.shapes.findIndex((s) => s.kind === 'line');
    const band = r.shapes.findIndex((s) => s.kind === 'rect' && s.fill === COLORS.headerFill);
    const lastGridFill = r.shapes
      .slice(0, band)
      .map((s) => s.kind)
      .lastIndexOf('rect');
    expect(lastGridFill).toBeLessThan(firstLine);
    const bg = r.shapes.findIndex((s) => s.kind === 'text' && s.color === COLORS.backgroundYear);
    expect(r.shapes[bg]).toMatchObject({ kind: 'text', text: '2027', align: 'right' });
    // Only weekend tint rects come before the background year.
    expect(bg).toBeGreaterThan(0);
    expect(
      r.shapes.slice(0, bg).every((s) => s.kind === 'rect' && s.fill === COLORS.weekendFill),
    ).toBe(true);
    const bgWidth = measurer.width('2027', (r.shapes[bg] as TextShape).size, true);
    expect(bgWidth).toBeCloseTo(r.grid.colW * 4);
  });
});

describe('layoutCalendar content', () => {
  it('prints the title, the export date and the month names', () => {
    const t = texts(run()).map((s) => s.text);
    expect(t).toContain('2027');
    expect(t).toContain(`${ru.updatedPrefix} 20.11.2026`);
    expect(t).toContain(ru.months[0].toLocaleUpperCase('ru'));
    expect(t).toContain(ru.months[11].toLocaleUpperCase('ru'));
  });

  it('split: shows "Y–Y+1" and a small Y+1 above the January column', () => {
    const r = run({ format: 'split' });
    expect(r.page.title).toBe('2027–2028');
    const next = texts(r).find((t) => t.text === '2028');
    const jan = 6;
    expect(next?.x).toBeCloseTo(r.grid.x + (jan + 0.5) * r.grid.colW);
    expect(next?.y).toBeLessThan(r.grid.y - 8);
  });

  it('colours weekends and holidays magenta and leaves 30 Feb empty', () => {
    const r = run();
    const day = (column: number, d: number): TextShape | undefined =>
      texts(r).find(
        (t) =>
          t.size === SIZES.dayNumber &&
          t.text === String(d) &&
          Math.abs(t.x - (r.grid.x + column * r.grid.colW + SIZES.dayTextLeft)) < 1e-6,
      );
    expect(day(0, 1)?.color).toBe(COLORS.magenta); // 1 Jan, holiday (Friday)
    expect(day(0, 4)?.color).toBe(COLORS.text); // Monday
    expect(day(0, 9)?.color).toBe(COLORS.magenta); // Saturday
    expect(day(1, 29)).toBeUndefined();
    expect(day(1, 30)).toBeUndefined();
  });

  it('fills labelled holidays and hides the label under an event', () => {
    const r = run();
    expect(
      texts(r).some((t) => t.text === ru.holidayLabels.easter && t.color === COLORS.holidayLabel),
    ).toBe(true);
    expect(r.shapes.filter((s) => s.kind === 'rect' && s.fill === COLORS.holidayFill)).toHaveLength(
      3,
    );

    const covered = run({ data: withEvents([event('e', '2027-05-01', '2027-05-03')]) });
    expect(texts(covered).some((t) => t.text === ru.holidayLabels.easter)).toBe(false);
    expect(
      covered.shapes.filter((s) => s.kind === 'rect' && s.fill === COLORS.holidayFill),
    ).toHaveLength(2);
    // The number stays magenta.
    expect(
      texts(covered).find(
        (t) =>
          t.text === '2' &&
          t.size === SIZES.dayNumber &&
          t.x > covered.grid.x + 4 * covered.grid.colW &&
          t.x < covered.grid.x + 5 * covered.grid.colW,
      )?.color,
    ).toBe(COLORS.magenta);
  });

  it('puts every seed event in the same cells as the reference (2027 year view)', () => {
    const r = run();
    const cells = new Map<string, string[]>();
    for (const h of r.hits) {
      const first = dayAt(r.grid, h.x + h.w / 2, h.y + r.grid.rowH / 2);
      const last = dayAt(r.grid, h.x + h.w / 2, h.y + h.h - r.grid.rowH / 2);
      cells.set(h.eventId, [...(cells.get(h.eventId) ?? []), `${first ?? ''}..${last ?? ''}`]);
    }
    expect(Object.fromEntries(cells)).toEqual({
      'ev-transrossiya-2027': ['2027-03-16..2027-03-18'],
      'ev-tl-forum-2027': ['2027-03-31..2027-03-31', '2027-04-01..2027-04-02'],
      'ev-transport-logistic-2027': ['2027-04-26..2027-04-29'],
      'ev-logistikaexpo-2027': ['2027-05-25..2027-05-28'],
      'ev-translogistica-caspian-2027': ['2027-06-02..2027-06-04'],
      'ev-cemat-asia-2027': ['2027-06-03..2027-06-05'],
      'ev-tl-astana-2027': ['2027-10-13..2027-10-15'],
      'ev-translogistica-2027': ['2027-11-09..2027-11-11'],
      'ev-transport-rossii-2027': ['2027-11-17..2027-11-19'],
    });
    // Caspian and CeMAT share June in two equal lanes.
    const caspian = r.hits.find((h) => h.eventId === 'ev-translogistica-caspian-2027');
    const cemat = r.hits.find((h) => h.eventId === 'ev-cemat-asia-2027');
    expect(caspian?.w).toBeCloseTo(r.grid.colW / 2);
    expect(cemat?.x).toBeCloseTo((caspian?.x ?? 0) + r.grid.colW / 2);
  });

  it('shows city and flag only on the primary segment', () => {
    const r = run();
    const flags = r.shapes.filter((s) => s.kind === 'image');
    expect(flags).toHaveLength(9);
    const spb = texts(r).filter((t) => t.text === 'СПб');
    expect(spb).toHaveLength(1);
  });

  it('skips invalid events instead of crashing', () => {
    const r = run({
      data: withEvents([
        event('bad', '2027-05-03', '2027-05-01'),
        event('bad2', '2027-02-30', '2027-03-01'),
      ]),
    });
    expect(r.hits).toEqual([]);
  });
});

describe('weekend tint (3.3)', () => {
  /** Day of each rect filled with `fill`, keyed by ISO date, with its index in the shapes. */
  function filledCells(r: LayoutResult, fill: string): Map<string, number> {
    const cells = new Map<string, number>();
    r.shapes.forEach((s, i) => {
      if (s.kind !== 'rect' || s.fill !== fill) return;
      expect(s.w).toBeCloseTo(r.grid.colW);
      expect(s.h).toBeCloseTo(r.grid.rowH);
      const iso = dayAt(r.grid, s.x + s.w / 2, s.y + s.h / 2);
      expect(iso).not.toBeNull();
      expect(cells.has(iso ?? '')).toBe(false);
      cells.set(iso ?? '', i);
    });
    return cells;
  }

  function weekendDays(format: FormatId, year: number): string[] {
    return pageMonths(format, year).flatMap(({ year: y, month }) =>
      Array.from({ length: daysInMonth(y, month) }, (_, i) => toISO(y, month, i + 1)).filter(
        (iso) => weekday(iso) >= 5,
      ),
    );
  }

  const bare: DataFile = { ...seed, events: [], holidays: [] };

  it.each(FORMAT_IDS)('%s: fills every Saturday and Sunday cell and nothing else', (format) => {
    const r = run({ format, data: bare });
    const tinted = [...filledCells(r, COLORS.weekendFill).keys()].sort();
    expect(tinted).toEqual(weekendDays(format, 2027).sort());
  });

  it.each(FORMAT_IDS)('%s: tint is drawn before the background year and all fills', (format) => {
    const r = run({ format });
    const tints = [...filledCells(r, COLORS.weekendFill).values()];
    const bg = r.shapes.findIndex((s) => s.kind === 'text' && s.color === COLORS.backgroundYear);
    const otherRects = r.shapes
      .map((s, i) => (s.kind === 'rect' && s.fill !== COLORS.weekendFill ? i : -1))
      .filter((i) => i >= 0);
    expect(tints.length).toBeGreaterThan(0);
    expect(Math.max(...tints)).toBeLessThan(bg);
    expect(Math.min(...otherRects)).toBeGreaterThan(bg);
  });

  it.each(FORMAT_IDS)('%s: a labelled holiday fill replaces the tint', (format) => {
    const r = run({ format });
    const tinted = filledCells(r, COLORS.weekendFill);
    const holidayFilled = filledCells(r, COLORS.holidayFill);
    for (const iso of weekendDays(format, 2027)) {
      // Each weekend cell has exactly one of the two fills.
      expect(tinted.has(iso) !== holidayFilled.has(iso)).toBe(true);
    }
  });

  it('labelled weekend holidays get the holiday fill, unlabelled ones keep the tint', () => {
    const r = run();
    const tinted = filledCells(r, COLORS.weekendFill);
    const holidayFilled = filledCells(r, COLORS.holidayFill);
    // 2 May 2027: Easter, Sunday, labelled. 7 Nov 2027: Sunday, labelled.
    for (const iso of ['2027-05-02', '2027-11-07']) {
      expect(holidayFilled.has(iso)).toBe(true);
      expect(tinted.has(iso)).toBe(false);
    }
    // 1 May 2027: Saturday, unlabelled holiday.
    expect(tinted.has('2027-05-01')).toBe(true);
    expect(holidayFilled.has('2027-05-01')).toBe(false);
  });

  it('event fills are drawn above the tint, also on a covered labelled holiday', () => {
    const r = run({ data: withEvents([event('e', '2027-05-01', '2027-05-03')]) });
    const tinted = filledCells(r, COLORS.weekendFill);
    const holidayFilled = filledCells(r, COLORS.holidayFill);
    const eventRect = r.shapes.findIndex((s) => s.kind === 'rect' && s.fill === '#B3A7E0');
    expect(holidayFilled.has('2027-05-02')).toBe(false);
    for (const iso of ['2027-05-01', '2027-05-02']) {
      expect(tinted.get(iso)).toBeLessThan(eventRect);
    }
  });

  it('uses the injected candidate tint', () => {
    const r = run({ weekendFill: WEEKEND_TINTS.pink });
    expect(filledCells(r, COLORS.weekendFill).size).toBe(0);
    expect(filledCells(r, WEEKEND_TINTS.pink).size).toBeGreaterThan(0);
  });

  it('defaults to the grey candidate', () => {
    expect(COLORS.weekendFill).toBe(WEEKEND_TINTS.grey);
    expect(WEEKEND_TINTS).toEqual({ grey: '#EFEFEF', pink: '#FCE8F1' });
  });
});

describe('warnings', () => {
  it('none for the seed in 2027', () => {
    expect(run().warnings).toEqual([]);
  });

  it('no holidays in a visible year', () => {
    expect(run({ format: 'split', year: 2028 }).warnings).toEqual([
      { kind: 'noHolidays', year: 2029 },
    ]);
  });

  it('three overlapping events', () => {
    const r = run({
      data: withEvents([
        event('a', '2027-02-01', '2027-02-03'),
        event('b', '2027-02-02', '2027-02-04'),
        event('c', '2027-02-03', '2027-02-05'),
      ]),
    });
    expect(r.warnings).toContainEqual({ kind: 'tripleOverlap', eventIds: ['a', 'b', 'c'] });
  });

  it('country without a flag', () => {
    const data = withEvents([event('a', '2027-02-01', '2027-02-03')]);
    data.countries = data.countries.map((c) => (c.id === 'ru' ? { ...c, flag: null } : c));
    expect(run({ data }).warnings).toEqual([{ kind: 'missingFlag', eventId: 'a' }]);
  });

  it('text that does not fit', () => {
    const data = withEvents([
      event('a', '2027-02-01', '2027-02-01'),
      event('b', '2027-02-01', '2027-02-01', { id: 'b' }),
      event('c', '2027-02-01', '2027-02-01', { id: 'c' }),
    ]);
    const kinds = run({ data, format: 'h1' }).warnings.map((w) => w.kind);
    expect(kinds).toContain('textOverflow');
  });
});

describe('dayAt', () => {
  it('maps points to days and rejects outside points and missing days', () => {
    const r = run();
    const { grid } = r;
    expect(dayAt(grid, grid.x + 0.1, grid.y + 0.1)).toBe('2027-01-01');
    expect(dayAt(grid, grid.x + 2.5 * grid.colW, grid.y + 15.5 * grid.rowH)).toBe('2027-03-16');
    expect(dayAt(grid, grid.x + 1.5 * grid.colW, grid.y + 29.5 * grid.rowH)).toBeNull();
    expect(dayAt(grid, grid.x - 1, grid.y + 1)).toBeNull();
    expect(dayAt(grid, grid.x + 1, grid.y - 1)).toBeNull();
    expect(dayAt(grid, grid.x + 1, grid.y + 31 * grid.rowH + 0.1)).toBeNull();
  });
});
