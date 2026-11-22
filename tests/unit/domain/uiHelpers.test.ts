import { describe, expect, it } from 'vitest';
import {
  isDarkColor,
  isHexColor,
  lightness,
  normalizeHex,
  relativeLuminance,
} from '../../../src/domain/color.ts';
import { formatDateRange } from '../../../src/domain/dateText.ts';
import { citySuggestions, eventsInPeriod } from '../../../src/domain/eventList.ts';
import { PALETTE } from '../../../src/domain/palette.ts';
import type { Event } from '../../../src/domain/types.ts';

describe('formatDateRange', () => {
  it('formats one day, a range in a month, across months and across years', () => {
    expect(formatDateRange('2027-03-16', '2027-03-16')).toBe('16 марта 2027');
    expect(formatDateRange('2027-03-16', '2027-03-18')).toBe('16–18 марта 2027');
    expect(formatDateRange('2027-03-31', '2027-04-02')).toBe('31 марта – 2 апреля 2027');
    expect(formatDateRange('2027-12-30', '2028-01-02')).toBe('30 декабря 2027 – 2 января 2028');
  });

  it('accepts the dates in either order', () => {
    expect(formatDateRange('2027-04-02', '2027-03-31')).toBe('31 марта – 2 апреля 2027');
  });
});

describe('colour', () => {
  it('validates and normalizes hex colours', () => {
    expect(isHexColor('#a1B2c3')).toBe(true);
    expect(isHexColor('#abc')).toBe(false);
    expect(normalizeHex('#a1b2c3')).toBe('#A1B2C3');
    expect(normalizeHex('blue')).toBeNull();
    expect(() => relativeLuminance('blue')).toThrow(RangeError);
  });

  it('computes luminance and lightness', () => {
    expect(relativeLuminance('#000000')).toBe(0);
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1);
    expect(lightness('#FFFFFF')).toBeCloseTo(100);
    expect(lightness('#010101')).toBeLessThan(1);
    expect(lightness('#777777')).toBeCloseTo(50, 0);
  });

  it('never flags a palette colour as dark; flags dark custom colours', () => {
    for (const p of PALETTE) expect(isDarkColor(p.hex)).toBe(false);
    expect(isDarkColor('#2B2B2B')).toBe(true);
    expect(isDarkColor('#5A5A5A')).toBe(true);
    expect(isDarkColor('#808080')).toBe(false);
  });
});

function ev(id: string, start: string, end: string, city = ''): Event {
  return {
    id,
    exhibitionId: 'x',
    start,
    end,
    city,
    countryId: null,
    color: '#D2D2D2',
    held: false,
    note: '',
  };
}

describe('eventsInPeriod', () => {
  const events = [
    ev('c', '2027-07-01', '2027-07-02'),
    ev('b', '2027-06-30', '2027-07-01'),
    ev('a', '2027-06-30', '2027-06-30'),
    ev('d', '2026-12-31', '2027-01-01'),
    ev('e', '2026-12-30', '2026-12-31'),
  ];

  it('keeps events touching the months, sorted by start then id', () => {
    const h1 = [1, 2, 3, 4, 5, 6].map((month) => ({ year: 2027, month }));
    expect(eventsInPeriod(events, h1).map((e) => e.id)).toEqual(['d', 'a', 'b']);
    expect(eventsInPeriod(events, []).length).toBe(0);
  });
});

describe('citySuggestions', () => {
  it('lists distinct non-empty cities alphabetically', () => {
    const list = [ev('1', '', '', 'Москва'), ev('2', '', '', ' Баку '), ev('3', '', '', 'Москва')];
    expect(citySuggestions([...list, ev('4', '', '', ' ')])).toEqual(['Баку', 'Москва']);
  });
});
