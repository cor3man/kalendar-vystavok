// ISO calendar dates (SPEC 4.1) as plain integers: no Date objects, no time zones.
import type { ISODate } from './types.ts';

export interface YMD {
  year: number;
  /** 1–12 */
  month: number;
  /** 1–31 */
  day: number;
}

const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

const MONTH_LENGTHS = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31] as const;

export function daysInMonth(year: number, month: number): number {
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`Invalid month: ${String(month)}`);
  }
  if (month === 2 && isLeapYear(year)) return 29;
  return MONTH_LENGTHS[month - 1] ?? 0;
}

function pad(n: number, width: number): string {
  return String(n).padStart(width, '0');
}

export function toISO(year: number, month: number, day: number): ISODate {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** Parses 'YYYY-MM-DD' and checks that the day exists. Returns null when invalid. */
export function tryParseISO(iso: string): YMD | null {
  const m = ISO_RE.exec(iso);
  if (m === null) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;
  return { year, month, day };
}

export function isValidISO(iso: string): boolean {
  return tryParseISO(iso) !== null;
}

export function parseISO(iso: string): YMD {
  const ymd = tryParseISO(iso);
  if (ymd === null) throw new RangeError(`Invalid ISO date: ${iso}`);
  return ymd;
}

/** Days since 1970-01-01 (proleptic Gregorian; H. Hinnant's days_from_civil). */
export function toDayNumber(iso: ISODate): number {
  const { year, month, day } = parseISO(iso);
  const y = month <= 2 ? year - 1 : year;
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const mp = (month + 9) % 12;
  const doy = Math.floor((153 * mp + 2) / 5) + day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Inverse of toDayNumber (civil_from_days). */
export function fromDayNumber(n: number): ISODate {
  const z = n + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp < 10 ? mp + 3 : mp - 9;
  const year = yoe + era * 400 + (month <= 2 ? 1 : 0);
  return toISO(year, month, day);
}

export function addDays(iso: ISODate, days: number): ISODate {
  return fromDayNumber(toDayNumber(iso) + days);
}

/** Number of days from a to b (b − a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return toDayNumber(b) - toDayNumber(a);
}

/** 0 = Monday … 6 = Sunday. */
export function weekday(iso: ISODate): number {
  // 1970-01-01 was a Thursday (index 3).
  return (((toDayNumber(iso) + 3) % 7) + 7) % 7;
}

/** ISO strings sort chronologically as plain strings. */
export function compareISO(a: ISODate, b: ISODate): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function minISO(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}

export function maxISO(a: ISODate, b: ISODate): ISODate {
  return a >= b ? a : b;
}

/** 'DD.MM.YYYY' (SPEC 5). */
export function formatDMY(iso: ISODate): string {
  const { year, month, day } = parseISO(iso);
  return `${pad(day, 2)}.${pad(month, 2)}.${pad(year, 4)}`;
}

export function yearOf(iso: ISODate): number {
  return parseISO(iso).year;
}

/**
 * Orthodox Easter Sunday as a Gregorian date (Meeus' Julian algorithm + 13 days).
 * The 13-day offset is valid for 1900–2099.
 */
export function orthodoxEaster(year: number): ISODate {
  if (!Number.isInteger(year) || year < 1900 || year > 2099) {
    throw new RangeError(`Orthodox Easter supported for 1900–2099, got ${String(year)}`);
  }
  const a = year % 4;
  const b = year % 7;
  const c = year % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  // (year, month, day) is a Julian calendar date; Julian → Gregorian is +13 days here.
  return addDays(toISO(year, month, day), 13);
}
