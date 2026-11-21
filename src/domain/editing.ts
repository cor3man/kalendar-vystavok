// Pure data edits behind the store's editing actions (SPEC 4.1, 5.4, 5.5, 5.8).
// Every function returns a new DataFile (settings untouched) or the reason it refused.
import { normalizeHex } from './color.ts';
import { addDays, compareISO, isValidISO } from './dates.ts';
import { belarusHolidays, mergeHolidays, sortHolidays } from './holidays.ts';
import type {
  Country,
  DataFile,
  Event,
  Exhibition,
  Holiday,
  Id,
  ImageData,
  ISODate,
} from './types.ts';
import { eventsUsingCountry, eventsUsingExhibition, isNameUnique } from './validation.ts';

/** SPEC 4.1: the short name prints in at most 4 lines. */
export const MAX_SHORT_NAME_LINES = 4;

/** "Копировать на следующий год": same weekdays a year later (SPEC 5.4). */
export const NEXT_YEAR_SHIFT_DAYS = 364;

export type EditError =
  | 'nameRequired'
  | 'nameTaken'
  | 'shortNameLines'
  | 'inUse'
  | 'notFound'
  | 'invalidDate'
  | 'invalidColor'
  | 'unknownExhibition'
  | 'unknownCountry'
  | 'dateTaken';

export type EditResult = { ok: true; data: DataFile } | { ok: false; error: EditError };

export type EventDraft = Omit<Event, 'id'>;
export type ExhibitionDraft = Omit<Exhibition, 'id'>;
export interface CountryDraft {
  name: string;
  flag: ImageData | null;
}

function ok(data: DataFile): EditResult {
  return { ok: true, data };
}

function fail(error: EditError): EditResult {
  return { ok: false, error };
}

/** Puts the item in place of the one with the same id, or appends it. */
function upsert<T extends { id: Id }>(list: readonly T[], item: T): T[] {
  const i = list.findIndex((x) => x.id === item.id);
  return i === -1 ? [...list, item] : list.map((x, j) => (j === i ? item : x));
}

function countryExists(data: DataFile, id: Id | null): boolean {
  return id === null || data.countries.some((c) => c.id === id);
}

/** Start and end in date order (SPEC 5.4: swapped automatically). */
export function normalizeRange(start: ISODate, end: ISODate): { start: ISODate; end: ISODate } {
  return compareISO(start, end) <= 0 ? { start, end } : { start: end, end: start };
}

/** Adds the event, or replaces the one with this id. */
export function saveEvent(data: DataFile, id: Id, draft: EventDraft): EditResult {
  if (!isValidISO(draft.start) || !isValidISO(draft.end)) return fail('invalidDate');
  const color = normalizeHex(draft.color);
  if (color === null) return fail('invalidColor');
  if (!data.exhibitions.some((x) => x.id === draft.exhibitionId)) return fail('unknownExhibition');
  if (!countryExists(data, draft.countryId)) return fail('unknownCountry');
  const event: Event = {
    id,
    exhibitionId: draft.exhibitionId,
    ...normalizeRange(draft.start, draft.end),
    city: draft.city.trim(),
    countryId: draft.countryId,
    color,
    held: draft.held,
    note: draft.note,
  };
  return ok({ ...data, events: upsert(data.events, event) });
}

export function deleteEvent(data: DataFile, id: Id): EditResult {
  if (!data.events.some((e) => e.id === id)) return fail('notFound');
  return ok({ ...data, events: data.events.filter((e) => e.id !== id) });
}

/** Draft of the same event a year later on the same weekdays, not yet held (approved M4). */
export function copyToNextYear(event: Event): EventDraft {
  return {
    exhibitionId: event.exhibitionId,
    start: addDays(event.start, NEXT_YEAR_SHIFT_DAYS),
    end: addDays(event.end, NEXT_YEAR_SHIFT_DAYS),
    city: event.city,
    countryId: event.countryId,
    color: event.color,
    held: false,
    note: event.note,
  };
}

function shortNameLines(shortName: string): number {
  return shortName.split('\n').length;
}

/** Adds the exhibition, or replaces the one with this id. An empty short name becomes the name. */
export function saveExhibition(data: DataFile, id: Id, draft: ExhibitionDraft): EditResult {
  const name = draft.name.trim();
  if (name === '') return fail('nameRequired');
  if (!isNameUnique(name, data.exhibitions, id)) return fail('nameTaken');
  const trimmed = draft.shortName.replace(/\r\n?/g, '\n').trim();
  const shortName = trimmed === '' ? name : trimmed;
  if (shortNameLines(shortName) > MAX_SHORT_NAME_LINES) return fail('shortNameLines');
  const defaultColor = normalizeHex(draft.defaultColor);
  if (defaultColor === null) return fail('invalidColor');
  if (!countryExists(data, draft.defaultCountryId)) return fail('unknownCountry');
  const exhibition: Exhibition = {
    id,
    name,
    shortName,
    logo: draft.logo,
    defaultCity: draft.defaultCity.trim(),
    defaultCountryId: draft.defaultCountryId,
    defaultColor,
  };
  return ok({ ...data, exhibitions: upsert(data.exhibitions, exhibition) });
}

/** SPEC 4.1: an exhibition used by an event cannot be deleted. */
export function deleteExhibition(data: DataFile, id: Id): EditResult {
  if (!data.exhibitions.some((x) => x.id === id)) return fail('notFound');
  if (eventsUsingExhibition(data, id).length > 0) return fail('inUse');
  return ok({ ...data, exhibitions: data.exhibitions.filter((x) => x.id !== id) });
}

export function saveCountry(data: DataFile, id: Id, draft: CountryDraft): EditResult {
  const name = draft.name.trim();
  if (name === '') return fail('nameRequired');
  if (!isNameUnique(name, data.countries, id)) return fail('nameTaken');
  const country: Country = { id, name, flag: draft.flag };
  return ok({ ...data, countries: upsert(data.countries, country) });
}

/**
 * SPEC 4.1: a country used by an event cannot be deleted. Exhibitions that only use it as their
 * default country lose that default.
 */
export function deleteCountry(data: DataFile, id: Id): EditResult {
  if (!data.countries.some((c) => c.id === id)) return fail('notFound');
  if (eventsUsingCountry(data, id).length > 0) return fail('inUse');
  return ok({
    ...data,
    countries: data.countries.filter((c) => c.id !== id),
    exhibitions: data.exhibitions.map((x) =>
      x.defaultCountryId === id ? { ...x, defaultCountryId: null } : x,
    ),
  });
}

/** Adds a holiday (`previousDate` null) or changes the one at `previousDate`. One per date. */
export function saveHoliday(
  data: DataFile,
  previousDate: ISODate | null,
  holiday: Holiday,
): EditResult {
  if (!isValidISO(holiday.date)) return fail('invalidDate');
  if (previousDate !== null && !data.holidays.some((h) => h.date === previousDate)) {
    return fail('notFound');
  }
  if (holiday.date !== previousDate && data.holidays.some((h) => h.date === holiday.date)) {
    return fail('dateTaken');
  }
  const rest = data.holidays.filter((h) => h.date !== previousDate);
  const next = { date: holiday.date, label: holiday.label.trim() };
  return ok({ ...data, holidays: sortHolidays([...rest, next]) });
}

export function deleteHoliday(data: DataFile, date: ISODate): EditResult {
  if (!data.holidays.some((h) => h.date === date)) return fail('notFound');
  return ok({ ...data, holidays: data.holidays.filter((h) => h.date !== date) });
}

/**
 * "Заполнить праздниками Беларуси" (SPEC 5.8): adds the default list of a year without
 * duplicating existing dates. Returns the same data object when nothing was added.
 */
export function fillBelarusHolidays(data: DataFile, year: number): DataFile {
  const merged = mergeHolidays(data.holidays, belarusHolidays(year));
  return merged.length === data.holidays.length ? data : { ...data, holidays: merged };
}
