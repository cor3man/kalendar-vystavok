import { describe, expect, it } from 'vitest';
import { buildSeed } from '../../../src/storage/seed.ts';
import { isNameUnique } from '../../../src/domain/validation.ts';
import { isValidISO } from '../../../src/domain/dates.ts';
import { PALETTE } from '../../../src/domain/palette.ts';

const seed = buildSeed({
  currentYear: 2026,
  appVersion: '0.2.0',
  savedAt: '2026-11-20T10:00:00.000Z',
});

describe('buildSeed', () => {
  it('has the header fields and settings', () => {
    expect(seed).toMatchObject({
      app: 'kalendar-vystavok',
      schemaVersion: 2,
      appVersion: '0.2.0',
      savedAt: '2026-11-20T10:00:00.000Z',
      settings: {
        lastYear: 2027,
        lastFormat: 'year',
        selectionMode: 'click-shift',
        weekendTint: 'grey',
        heldMark: 'show',
        startup: 'last',
        recentColors: [],
      },
    });
  });

  it('preloads 30 countries, all with flags', () => {
    expect(seed.countries).toHaveLength(30);
    for (const c of seed.countries) {
      expect(c.flag?.dataUrl.startsWith('data:image/svg+xml;base64,')).toBe(true);
      expect(c.flag?.dataUrl.length).toBeLessThanOrEqual(200 * 1024);
      expect(isNameUnique(c.name, seed.countries, c.id)).toBe(true);
    }
  });

  it('creates the 9 exhibitions and 2027 events of Appendix A', () => {
    expect(seed.exhibitions).toHaveLength(9);
    expect(seed.events).toHaveLength(9);
    const countryIds = new Set(seed.countries.map((c) => c.id));
    const palette = new Set<string>(PALETTE.map((p) => p.hex));
    for (const ex of seed.exhibitions) {
      expect(ex.shortName).toBe(ex.name);
      expect(isNameUnique(ex.name, seed.exhibitions, ex.id)).toBe(true);
    }
    for (const e of seed.events) {
      const ex = seed.exhibitions.find((x) => x.id === e.exhibitionId);
      expect(ex).toBeDefined();
      expect(e.city).toBe(ex?.defaultCity);
      expect(e.countryId).toBe(ex?.defaultCountryId);
      expect(e.color).toBe(ex?.defaultColor);
      expect(countryIds.has(e.countryId ?? '')).toBe(true);
      expect(palette.has(e.color)).toBe(true);
      expect(isValidISO(e.start) && isValidISO(e.end) && e.start <= e.end).toBe(true);
      expect(e.start.startsWith('2027-')).toBe(true);
    }
  });

  it('matches the reference dates', () => {
    const dates = Object.fromEntries(seed.events.map((e) => [e.id, [e.start, e.end]]));
    expect(dates).toEqual({
      'ev-transrossiya-2027': ['2027-03-16', '2027-03-18'],
      'ev-tl-forum-2027': ['2027-03-31', '2027-04-02'],
      'ev-transport-logistic-2027': ['2027-04-26', '2027-04-29'],
      'ev-logistikaexpo-2027': ['2027-05-25', '2027-05-28'],
      'ev-translogistica-caspian-2027': ['2027-06-02', '2027-06-04'],
      'ev-cemat-asia-2027': ['2027-06-03', '2027-06-05'],
      'ev-tl-astana-2027': ['2027-10-13', '2027-10-15'],
      'ev-translogistica-2027': ['2027-11-09', '2027-11-11'],
      'ev-transport-rossii-2027': ['2027-11-17', '2027-11-19'],
    });
  });

  it('generates holidays for the current year and the next two', () => {
    const years = new Set(seed.holidays.map((h) => h.date.slice(0, 4)));
    expect([...years]).toEqual(['2026', '2027', '2028']);
    expect(seed.holidays).toHaveLength(33);
  });

  it('has unique ids', () => {
    const ids = [...seed.countries, ...seed.exhibitions, ...seed.events].map((x) => x.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
