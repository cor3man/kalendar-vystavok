// Large deterministic data set for the performance checks of SPEC 7.1:
// 10 years, 2 000 events (200 per year), 300 exhibitions with distinct logos.
import { crc32, deflateSync } from 'node:zlib';
import { addDays, toISO } from '../../../src/domain/dates.ts';
import type { DataFile, Event, Exhibition } from '../../../src/domain/types.ts';
import { buildSeed } from '../../../src/storage/seed.ts';

const LOGO_W = 300;
const LOGO_H = 150;

/**
 * A distinct flat-colour RGBA logo (diagonal stripes, transparent margin), like real logos:
 * a few KB as a file, but the full 300 × 150 pixels for the PDF encoder to process.
 */
function logoPng(i: number): string {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(LOGO_W, 0);
  header.writeUInt32BE(LOGO_H, 4);
  header.set([8, 6, 0, 0, 0], 8); // 8-bit RGBA, like uploaded logos after resizing
  const rows: Buffer[] = [];
  for (let y = 0; y < LOGO_H; y++) {
    const row = Buffer.alloc(1 + LOGO_W * 4); // filter byte 0
    for (let x = 0; x < LOGO_W; x++) {
      const o = 1 + x * 4;
      const inside = x > 10 && x < LOGO_W - 10 && y > 10 && y < LOGO_H - 10;
      const stripe = Math.floor((x + y) / 12) % 2 === 0;
      row[o] = stripe ? (i * 37) & 0xff : 0xff;
      row[o + 1] = stripe ? (i * 91) & 0xff : 0xff;
      row[o + 2] = stripe ? 0x30 : 0xff;
      row[o + 3] = inside ? 0xff : 0;
    }
    rows.push(row);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(Buffer.concat(rows))),
    chunk('IEND', Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString('base64')}`;
}

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
      logo: { dataUrl: logoPng(i), width: LOGO_W, height: LOGO_H },
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
