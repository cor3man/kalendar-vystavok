import { describe, expect, it } from 'vitest';
import {
  addDays,
  compareISO,
  daysInMonth,
  diffDays,
  formatDMY,
  fromDayNumber,
  isLeapYear,
  isValidISO,
  maxISO,
  minISO,
  orthodoxEaster,
  parseISO,
  toDayNumber,
  toISO,
  weekday,
  yearOf,
} from '../../../src/domain/dates.ts';
import { RADUNITSA_OFFSET_DAYS } from '../../../src/domain/holidays.ts';

describe('month lengths and leap years', () => {
  it('knows leap years including century rules', () => {
    expect([2024, 2000, 2028].map(isLeapYear)).toEqual([true, true, true]);
    expect([2027, 1900, 2100].map(isLeapYear)).toEqual([false, false, false]);
  });

  it('gives month lengths', () => {
    expect(Array.from({ length: 12 }, (_, i) => daysInMonth(2027, i + 1))).toEqual([
      31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31,
    ]);
    expect(daysInMonth(2028, 2)).toBe(29);
  });

  it('rejects invalid months', () => {
    expect(() => daysInMonth(2027, 0)).toThrow(RangeError);
    expect(() => daysInMonth(2027, 13)).toThrow(RangeError);
  });
});

describe('ISO parsing', () => {
  it('parses valid dates', () => {
    expect(parseISO('2027-03-16')).toEqual({ year: 2027, month: 3, day: 16 });
    expect(yearOf('2028-02-29')).toBe(2028);
  });

  it('rejects malformed and non-existing dates', () => {
    for (const bad of [
      '2027-02-29',
      '2027-13-01',
      '2027-00-10',
      '2027-04-31',
      '27-01-01',
      '2027-1-1',
      '',
      'x',
    ]) {
      expect(isValidISO(bad)).toBe(false);
    }
    expect(() => parseISO('2027-02-30')).toThrow(RangeError);
  });

  it('formats', () => {
    expect(toISO(2027, 3, 1)).toBe('2027-03-01');
    expect(formatDMY('2027-03-01')).toBe('01.03.2027');
  });
});

describe('day arithmetic', () => {
  it('round-trips day numbers', () => {
    expect(toDayNumber('1970-01-01')).toBe(0);
    expect(fromDayNumber(0)).toBe('1970-01-01');
    for (const iso of ['1900-03-01', '2000-02-29', '2027-12-31', '2099-01-01', '1969-12-31']) {
      expect(fromDayNumber(toDayNumber(iso))).toBe(iso);
    }
  });

  it('adds days across months and years', () => {
    expect(addDays('2027-03-31', 2)).toBe('2027-04-02');
    expect(addDays('2027-12-31', 1)).toBe('2028-01-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2027-01-01', -1)).toBe('2026-12-31');
    expect(addDays('2027-03-16', 364)).toBe('2028-03-14');
  });

  it('diffs days', () => {
    expect(diffDays('2027-03-31', '2027-04-02')).toBe(2);
    expect(diffDays('2027-01-01', '2028-01-01')).toBe(365);
  });

  it('gives weekdays with Monday = 0', () => {
    expect(weekday('2027-01-01')).toBe(4); // Friday (reference: "1 Пт")
    expect(weekday('2027-03-16')).toBe(1); // Tuesday
    expect(weekday('1970-01-01')).toBe(3); // Thursday
    expect(weekday('1969-12-28')).toBe(6); // Sunday, before the epoch
  });

  it('compares', () => {
    expect(compareISO('2027-01-02', '2027-01-10')).toBe(-1);
    expect(compareISO('2027-01-10', '2027-01-02')).toBe(1);
    expect(compareISO('2027-01-10', '2027-01-10')).toBe(0);
    expect(minISO('2027-05-01', '2027-04-30')).toBe('2027-04-30');
    expect(maxISO('2027-05-01', '2027-04-30')).toBe('2027-05-01');
  });
});

describe('Orthodox Easter', () => {
  const table: Record<string, string> = {
    '2020': '2020-04-19',
    '2021': '2021-05-02',
    '2022': '2022-04-24',
    '2023': '2023-04-16',
    '2024': '2024-05-05',
    '2025': '2025-04-20',
    '2026': '2026-04-12',
    '2027': '2027-05-02',
    '2028': '2028-04-16',
    '2029': '2029-04-08',
    '2030': '2030-04-28',
    '2031': '2031-04-13',
    '2032': '2032-05-02',
    '2033': '2033-04-24',
    '2034': '2034-04-09',
    '2035': '2035-04-29',
  };

  it.each(Object.entries(table))('%s', (year, date) => {
    const easter = orthodoxEaster(Number(year));
    expect(easter).toBe(date);
    expect(weekday(easter)).toBe(6);
    expect(weekday(addDays(easter, RADUNITSA_OFFSET_DAYS))).toBe(1);
  });

  it('gives Radunitsa 2027 on 11 May', () => {
    expect(addDays(orthodoxEaster(2027), RADUNITSA_OFFSET_DAYS)).toBe('2027-05-11');
  });

  it('rejects years outside 1900–2099', () => {
    expect(() => orthodoxEaster(1899)).toThrow(RangeError);
    expect(() => orthodoxEaster(2100)).toThrow(RangeError);
  });
});
