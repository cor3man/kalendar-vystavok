// Entities of SPEC 4.1. Pure types, shared by domain, layout, storage and UI.

/** 'YYYY-MM-DD', calendar date, no time zone. */
export type ISODate = string;
/** Random id, e.g. nanoid(10). Seed data uses readable stable ids. */
export type Id = string;

/** Embedded image (PNG or SVG data URL) with its pixel size for the aspect ratio. */
export interface ImageData {
  dataUrl: string;
  width: number;
  height: number;
}

export interface Country {
  id: Id;
  name: string;
  flag: ImageData | null;
}

export interface Exhibition {
  id: Id;
  name: string;
  /** Text printed in the calendar; '\n' = forced line break, max 4 lines. */
  shortName: string;
  logo: ImageData | null;
  defaultCity: string;
  defaultCountryId: Id | null;
  /** '#RRGGBB' */
  defaultColor: string;
}

export interface Event {
  id: Id;
  exhibitionId: Id;
  /** Inclusive. */
  start: ISODate;
  /** Inclusive, end >= start. */
  end: ISODate;
  city: string;
  countryId: Id | null;
  /** '#RRGGBB' */
  color: string;
  held: boolean;
  /** Internal, never printed. */
  note: string;
}

/** label '' = the day number turns magenta only. */
export interface Holiday {
  date: ISODate;
  label: string;
}

export type FormatId = 'year' | 'h1' | 'h2' | 'split';

export interface Settings {
  lastYear: number;
  lastFormat: FormatId;
}

export interface DataFile {
  app: 'kalendar-vystavok';
  schemaVersion: 1;
  /** ISO timestamp. */
  savedAt: string;
  /** Semver of the app that saved it. */
  appVersion: string;
  countries: Country[];
  exhibitions: Exhibition[];
  events: Event[];
  holidays: Holiday[];
  settings: Settings;
}

/** Warnings of SPEC 5.7, produced by the layout. */
export type Warning =
  | { kind: 'textOverflow'; eventId: Id }
  | { kind: 'tripleOverlap'; eventIds: Id[] }
  | { kind: 'missingFlag'; eventId: Id }
  | { kind: 'noHolidays'; year: number };
