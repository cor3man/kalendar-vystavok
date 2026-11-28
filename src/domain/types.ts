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

/** How a new event's days are picked on the calendar (SPEC 5.3). */
export type SelectionMode = 'click-shift' | 'drag';
/** Weekend cell fill (SPEC 3.3): a named tint or a custom '#RRGGBB'. */
// The intersection keeps the two names visible in editor hints while allowing any string.
export type WeekendTint = 'grey' | 'pink' | (string & Record<never, never>);
/** Whether held events show the check mark (SPEC 3.6). */
export type HeldMark = 'show' | 'none';
/** Year and format on opening the data (SPEC 5.10). */
export type StartupMode = 'last' | 'current';

/** SPEC 4.1, 5.10. Not part of the undo history. */
export interface Settings {
  lastYear: number;
  lastFormat: FormatId;
  selectionMode: SelectionMode;
  weekendTint: WeekendTint;
  heldMark: HeldMark;
  startup: StartupMode;
  /** '#RRGGBB', newest first, max 8, no duplicates. */
  recentColors: string[];
}

export interface DataFile {
  app: 'kalendar-vystavok';
  schemaVersion: 2;
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
