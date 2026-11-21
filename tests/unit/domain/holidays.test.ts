import { describe, expect, it } from 'vitest';
import { belarusHolidays, mergeHolidays } from '../../../src/domain/holidays.ts';
import { ru } from '../../../src/i18n/ru.ts';

describe('belarusHolidays', () => {
  it('lists the 2027 holidays of Appendix B in date order', () => {
    expect(belarusHolidays(2027)).toEqual([
      { date: '2027-01-01', label: '' },
      { date: '2027-01-02', label: '' },
      { date: '2027-01-07', label: '' },
      { date: '2027-03-08', label: '' },
      { date: '2027-05-01', label: '' },
      { date: '2027-05-02', label: ru.holidayLabels.easter },
      { date: '2027-05-09', label: '' },
      { date: '2027-05-11', label: ru.holidayLabels.radunitsa },
      { date: '2027-07-03', label: '' },
      { date: '2027-11-07', label: ru.holidayLabels.november7 },
      { date: '2027-12-25', label: '' },
    ]);
  });

  it('keeps one entry per date, the labelled one winning', () => {
    // 2062: Easter 30 April, so Radunitsa falls on 9 May.
    const list = belarusHolidays(2062);
    expect(list.filter((h) => h.date === '2062-05-09')).toEqual([
      { date: '2062-05-09', label: ru.holidayLabels.radunitsa },
    ]);
    expect(new Set(list.map((h) => h.date)).size).toBe(list.length);
  });
});

describe('mergeHolidays', () => {
  it('adds only missing dates and keeps existing labels', () => {
    const merged = mergeHolidays([{ date: '2027-05-02', label: 'custom' }], belarusHolidays(2027));
    expect(merged).toHaveLength(11);
    expect(merged.find((h) => h.date === '2027-05-02')?.label).toBe('custom');
    expect(merged.map((h) => h.date)).toEqual(merged.map((h) => h.date).sort());
  });
});
