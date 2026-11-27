import { describe, expect, it } from 'vitest';
import {
  copyToNextYear,
  deleteCountry,
  deleteEvent,
  deleteExhibition,
  deleteHoliday,
  fillBelarusHolidays,
  normalizeRange,
  saveCountry,
  saveEvent,
  saveExhibition,
  saveHoliday,
  type EditResult,
  type EventDraft,
  type ExhibitionDraft,
} from '../../../src/domain/editing.ts';
import { weekday } from '../../../src/domain/dates.ts';
import { belarusHolidays } from '../../../src/domain/holidays.ts';
import type { DataFile } from '../../../src/domain/types.ts';
import { parseDataFile, serializeDataFile } from '../../../src/storage/schema.ts';
import fixture from '../../fixtures/v2-minimal.json' with { type: 'json' };

const base = fixture as DataFile;

function data(result: EditResult): DataFile {
  if (!result.ok) throw new Error(`Edit refused: ${result.error}`);
  // Every successful edit must keep the file valid.
  expect(parseDataFile(serializeDataFile(result.data)).kind).toBe('ok');
  return result.data;
}

const draft: EventDraft = {
  exhibitionId: 'ex-a',
  start: '2027-05-12',
  end: '2027-05-10',
  city: '  Минск ',
  countryId: 'de',
  color: '#cde8c8',
  held: false,
  note: '',
};

const exhibitionDraft: ExhibitionDraft = {
  name: ' New Expo ',
  shortName: '',
  logo: null,
  defaultCity: 'Минск',
  defaultCountryId: null,
  defaultColor: '#F7E8A4',
};

describe('events', () => {
  it('adds an event with swapped dates, trimmed city and upper-case colour', () => {
    const d = data(saveEvent(base, 'ev-new', draft));
    expect(d.events.find((e) => e.id === 'ev-new')).toEqual({
      ...draft,
      id: 'ev-new',
      start: '2027-05-10',
      end: '2027-05-12',
      city: 'Минск',
      color: '#CDE8C8',
    });
    expect(d.settings).toBe(base.settings);
  });

  it('replaces an existing event in place', () => {
    const d = data(saveEvent(base, 'ev-a', { ...draft, held: true }));
    expect(d.events).toHaveLength(1);
    expect(d.events[0]?.held).toBe(true);
  });

  it('refuses invalid dates, colours and references', () => {
    expect(saveEvent(base, 'x', { ...draft, start: '2027-02-30' })).toEqual({
      ok: false,
      error: 'invalidDate',
    });
    expect(saveEvent(base, 'x', { ...draft, color: 'red' })).toMatchObject({
      error: 'invalidColor',
    });
    expect(saveEvent(base, 'x', { ...draft, exhibitionId: 'nope' })).toMatchObject({
      error: 'unknownExhibition',
    });
    expect(saveEvent(base, 'x', { ...draft, countryId: 'nope' })).toMatchObject({
      error: 'unknownCountry',
    });
  });

  it('deletes an event', () => {
    expect(data(deleteEvent(base, 'ev-a')).events).toEqual([]);
    expect(deleteEvent(base, 'nope')).toMatchObject({ error: 'notFound' });
  });

  it('copies an event to the same weekdays a year later, not held', () => {
    const event = base.events[0];
    if (event === undefined) throw new Error('fixture has an event');
    const copy = copyToNextYear(event);
    expect(copy).toMatchObject({ start: '2028-03-29', end: '2028-03-31', held: false });
    expect(weekday(copy.start)).toBe(weekday(event.start));
    expect(copy.note).toBe(event.note);
  });

  it('normalizes a range in date order', () => {
    expect(normalizeRange('2027-04-02', '2027-03-31')).toEqual({
      start: '2027-03-31',
      end: '2027-04-02',
    });
  });
});

describe('exhibitions', () => {
  it('adds one with a trimmed name; an empty short name becomes the name', () => {
    const d = data(saveExhibition(base, 'ex-new', exhibitionDraft));
    expect(d.exhibitions.find((x) => x.id === 'ex-new')).toMatchObject({
      name: 'New Expo',
      shortName: 'New Expo',
    });
  });

  it('keeps manual line breaks and refuses more than 4 lines', () => {
    const d = data(saveExhibition(base, 'n', { ...exhibitionDraft, shortName: 'a\r\nb' }));
    expect(d.exhibitions.find((x) => x.id === 'n')?.shortName).toBe('a\nb');
    expect(saveExhibition(base, 'n', { ...exhibitionDraft, shortName: 'a\nb\nc\nd\ne' })).toEqual({
      ok: false,
      error: 'shortNameLines',
    });
  });

  it('requires a unique, non-empty name (case-insensitive)', () => {
    expect(saveExhibition(base, 'n', { ...exhibitionDraft, name: '  ' })).toMatchObject({
      error: 'nameRequired',
    });
    expect(saveExhibition(base, 'n', { ...exhibitionDraft, name: 'test EXPO' })).toMatchObject({
      error: 'nameTaken',
    });
    // Renaming itself to the same name is fine.
    expect(saveExhibition(base, 'ex-a', { ...exhibitionDraft, name: 'Test Expo' }).ok).toBe(true);
  });

  it('refuses a bad default colour or country', () => {
    expect(saveExhibition(base, 'n', { ...exhibitionDraft, defaultColor: '#123' })).toMatchObject({
      error: 'invalidColor',
    });
    expect(saveExhibition(base, 'n', { ...exhibitionDraft, defaultCountryId: 'zz' })).toMatchObject(
      { error: 'unknownCountry' },
    );
  });

  it('cannot delete an exhibition in use', () => {
    expect(deleteExhibition(base, 'ex-a')).toMatchObject({ error: 'inUse' });
    expect(deleteExhibition(base, 'nope')).toMatchObject({ error: 'notFound' });
    const unused = data(deleteEvent(base, 'ev-a'));
    expect(data(deleteExhibition(unused, 'ex-a')).exhibitions).toEqual([]);
  });
});

describe('countries', () => {
  it('adds and renames with unique names', () => {
    const d = data(saveCountry(base, 'kz', { name: 'Казахстан', flag: null }));
    expect(d.countries).toHaveLength(3);
    expect(saveCountry(base, 'kz', { name: 'россия', flag: null })).toMatchObject({
      error: 'nameTaken',
    });
    expect(saveCountry(base, 'kz', { name: '', flag: null })).toMatchObject({
      error: 'nameRequired',
    });
  });

  it('cannot delete a country used by an event; clears exhibition defaults', () => {
    expect(deleteCountry(base, 'ru')).toMatchObject({ error: 'inUse' });
    expect(deleteCountry(base, 'nope')).toMatchObject({ error: 'notFound' });
    const unused = data(deleteEvent(base, 'ev-a'));
    const d = data(deleteCountry(unused, 'ru'));
    expect(d.countries.map((c) => c.id)).toEqual(['de']);
    expect(d.exhibitions[0]?.defaultCountryId).toBeNull();
  });
});

describe('holidays', () => {
  it('adds, changes and deletes holidays, one per date, sorted', () => {
    let d = data(saveHoliday(base, null, { date: '2026-12-31', label: ' x ' }));
    expect(d.holidays).toEqual([
      { date: '2026-12-31', label: 'x' },
      { date: '2027-01-01', label: '' },
    ]);
    d = data(saveHoliday(d, '2026-12-31', { date: '2027-01-02', label: 'y' }));
    expect(d.holidays.map((h) => h.date)).toEqual(['2027-01-01', '2027-01-02']);
    expect(saveHoliday(d, null, { date: '2027-01-01', label: '' })).toMatchObject({
      error: 'dateTaken',
    });
    expect(saveHoliday(d, '2027-01-02', { date: '2027-01-01', label: '' })).toMatchObject({
      error: 'dateTaken',
    });
    expect(saveHoliday(d, '2030-01-01', { date: '2030-01-02', label: '' })).toMatchObject({
      error: 'notFound',
    });
    expect(saveHoliday(d, null, { date: 'bad', label: '' })).toMatchObject({
      error: 'invalidDate',
    });
    expect(data(deleteHoliday(d, '2027-01-01')).holidays).toHaveLength(1);
    expect(deleteHoliday(d, '2030-01-01')).toMatchObject({ error: 'notFound' });
  });

  it('fills the Belarus defaults without duplicating existing dates', () => {
    const custom = { ...base, holidays: [{ date: '2027-01-01', label: 'Новый год' }] };
    const d = fillBelarusHolidays(custom, 2027);
    expect(d.holidays).toHaveLength(belarusHolidays(2027).length);
    expect(d.holidays.find((h) => h.date === '2027-01-01')?.label).toBe('Новый год');
    expect(fillBelarusHolidays(d, 2027)).toBe(d);
  });
});
