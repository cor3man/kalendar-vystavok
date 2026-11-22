// Large deterministic data set for the performance checks of SPEC 7.1:
// 10 years, 2 000 events (200 per year), 300 exhibitions with logos.
import { addDays, toISO } from '../../../src/domain/dates.ts';
import type { DataFile, Event, Exhibition } from '../../../src/domain/types.ts';
import { buildSeed } from '../../../src/storage/seed.ts';

/** 1 × 1 transparent PNG. */
const TINY_PNG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==';

const COLORS = ['#B3A7E0', '#E4DFF6', '#CFE8F5', '#D2D2D2', '#9C9C9C', '#F6CBD6'];

export const BIG_FIRST_YEAR = 2027;
export const BIG_YEARS = 10;
export const BIG_EVENTS_PER_YEAR = 200;
export const BIG_EXHIBITIONS = 300;

export function buildBigData(): DataFile {
  const seed = buildSeed({
    currentYear: BIG_FIRST_YEAR - 1,
    appVersion: '1.0.0',
    savedAt: '2026-11-22T10:00:00.000Z',
  });
  const countryIds = seed.countries.map((c) => c.id);
  const exhibitions: Exhibition[] = [];
  for (let i = 0; i < BIG_EXHIBITIONS; i++) {
    exhibitions.push({
      id: `big-ex-${String(i)}`,
      name: `Exhibition ${String(i)} Logistics Expo`,
      shortName: `Exhibition ${String(i)}`,
      logo: { dataUrl: TINY_PNG, width: 1, height: 1 },
      defaultCity: `City ${String(i % 40)}`,
      defaultCountryId: countryIds[i % countryIds.length] ?? null,
      defaultColor: COLORS[i % COLORS.length] ?? '#D2D2D2',
    });
  }
  const events: Event[] = [];
  for (let y = 0; y < BIG_YEARS; y++) {
    const year = BIG_FIRST_YEAR + y;
    const jan1 = toISO(year, 1, 1);
    for (let i = 0; i < BIG_EVENTS_PER_YEAR; i++) {
      const ex = exhibitions[(y * BIG_EVENTS_PER_YEAR + i) % BIG_EXHIBITIONS];
      if (ex === undefined) throw new Error('unreachable');
      // Spread over days 0..359, 1–5 days long; many overlaps, like a busy real year.
      const start = addDays(jan1, (i * 97 + y * 13) % 360);
      const length = (i % 5) + 1;
      events.push({
        id: `big-ev-${String(year)}-${String(i)}`,
        exhibitionId: ex.id,
        start,
        end: addDays(start, length - 1),
        city: ex.defaultCity,
        countryId: ex.defaultCountryId,
        color: ex.defaultColor,
        held: i % 3 === 0,
        note: '',
      });
    }
  }
  return { ...seed, exhibitions: [...seed.exhibitions, ...exhibitions], events };
}
