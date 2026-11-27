// Seed data (SPEC Appendix A): the 2027 events of the reference PDF, 30 countries, Belarus holidays.
import { belarusHolidays } from '../domain/holidays.ts';
import { isPaletteId, paletteHex } from '../domain/palette.ts';
import { DEFAULT_PREFERENCES } from '../domain/settings.ts';
import type { Country, DataFile, Event, Exhibition, Holiday, ImageData } from '../domain/types.ts';
import seedJson from './seed.json' with { type: 'json' };
import seedFlags from './seedFlags.json' with { type: 'json' };

const flags: Record<string, ImageData | undefined> = seedFlags;

/** Number of years of holidays generated on first creation: the current year and the next two (5.8). */
export const SEED_HOLIDAY_YEARS = 3;

export interface SeedOptions {
  /** Today's year, injected by the caller (no clock in this module). */
  currentYear: number;
  appVersion: string;
  /** ISO timestamp written to `savedAt`. */
  savedAt: string;
}

function eventYear(start: string): string {
  return start.slice(0, 4);
}

/** Builds the initial data file. Ids are stable so tests and fixtures stay readable. */
export function buildSeed({ currentYear, appVersion, savedAt }: SeedOptions): DataFile {
  const countries: Country[] = seedJson.countries.map((c) => ({
    id: c.id,
    name: c.name,
    flag: flags[c.id] ?? null,
  }));

  const exhibitions: Exhibition[] = [];
  const events: Event[] = [];
  for (const row of seedJson.exhibitions) {
    if (!isPaletteId(row.color)) throw new Error(`Unknown palette colour in seed: ${row.color}`);
    const color = paletteHex(row.color);
    const exhibitionId = `ex-${row.key}`;
    exhibitions.push({
      id: exhibitionId,
      name: row.name,
      shortName: row.name,
      logo: null,
      defaultCity: row.city,
      defaultCountryId: row.countryId,
      defaultColor: color,
    });
    events.push({
      id: `ev-${row.key}-${eventYear(row.start)}`,
      exhibitionId,
      start: row.start,
      end: row.end,
      city: row.city,
      countryId: row.countryId,
      color,
      held: false,
      note: '',
    });
  }

  const holidays: Holiday[] = [];
  for (let i = 0; i < SEED_HOLIDAY_YEARS; i++) holidays.push(...belarusHolidays(currentYear + i));

  return {
    app: 'kalendar-vystavok',
    schemaVersion: 2,
    savedAt,
    appVersion,
    countries,
    exhibitions,
    events,
    holidays,
    settings: { lastYear: 2027, lastFormat: 'year', ...DEFAULT_PREFERENCES, recentColors: [] },
  };
}
