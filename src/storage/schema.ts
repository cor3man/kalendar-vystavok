// zod schema of the data file (SPEC 4.1, 4.4) and the parse → migrate → validate pipeline.
import { z } from 'zod';
import { compareISO, isValidISO } from '../domain/dates.ts';
import type { DataFile } from '../domain/types.ts';
import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  migrate,
  type Migration,
  type RawData,
} from './migrations/index.ts';

const APP_ID = 'kalendar-vystavok';

const id = z.string().min(1);
const isoDate = z.string().refine(isValidISO, { message: 'Expected a YYYY-MM-DD date' });
const hexColor = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Expected a #RRGGBB colour');

const imageData = z.object({
  dataUrl: z.string().regex(/^data:image\/(png|svg\+xml)[;,]/, 'Expected a PNG or SVG data URL'),
  width: z.number().positive(),
  height: z.number().positive(),
});

const country = z.object({ id, name: z.string(), flag: imageData.nullable() });

const exhibition = z.object({
  id,
  name: z.string(),
  shortName: z.string(),
  logo: imageData.nullable(),
  defaultCity: z.string(),
  defaultCountryId: id.nullable(),
  defaultColor: hexColor,
});

const event = z
  .object({
    id,
    exhibitionId: id,
    start: isoDate,
    end: isoDate,
    city: z.string(),
    countryId: id.nullable(),
    color: hexColor,
    held: z.boolean(),
    note: z.string(),
  })
  .refine((e) => !isValidISO(e.start) || !isValidISO(e.end) || compareISO(e.end, e.start) >= 0, {
    message: 'Event ends before it starts',
    path: ['end'],
  });

const holiday = z.object({ date: isoDate, label: z.string() });

/** Everything except `schemaVersion`, which the pipeline checks and sets itself. */
const body = z
  .object({
    app: z.literal(APP_ID),
    savedAt: z.string(),
    appVersion: z.string(),
    countries: z.array(country),
    exhibitions: z.array(exhibition),
    events: z.array(event),
    holidays: z.array(holiday),
    settings: z.object({
      lastYear: z.number().int(),
      lastFormat: z.enum(['year', 'h1', 'h2', 'split']),
    }),
  })
  .superRefine((d, ctx) => {
    const seen = new Set<string>();
    const lists = [
      ['countries', d.countries],
      ['exhibitions', d.exhibitions],
      ['events', d.events],
    ] as const;
    for (const [key, list] of lists) {
      list.forEach((item, i) => {
        if (seen.has(item.id)) {
          ctx.addIssue({
            code: 'custom',
            message: `Duplicate id ${item.id}`,
            path: [key, i, 'id'],
          });
        }
        seen.add(item.id);
      });
    }
    const countryIds = new Set(d.countries.map((c) => c.id));
    const exhibitionIds = new Set(d.exhibitions.map((x) => x.id));
    d.exhibitions.forEach((x, i) => {
      if (x.defaultCountryId !== null && !countryIds.has(x.defaultCountryId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Unknown country ${x.defaultCountryId}`,
          path: ['exhibitions', i, 'defaultCountryId'],
        });
      }
    });
    d.events.forEach((e, i) => {
      if (!exhibitionIds.has(e.exhibitionId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Unknown exhibition ${e.exhibitionId}`,
          path: ['events', i, 'exhibitionId'],
        });
      }
      if (e.countryId !== null && !countryIds.has(e.countryId)) {
        ctx.addIssue({
          code: 'custom',
          message: `Unknown country ${e.countryId}`,
          path: ['events', i, 'countryId'],
        });
      }
    });
  });

export type ParseResult =
  /** Valid data; `migratedFrom` is the file's old version when migrations ran. */
  | { kind: 'ok'; data: DataFile; migratedFrom: number | null }
  /** Written by a newer app; still readable with the current shape, so it opens read-only. */
  | { kind: 'newer'; data: DataFile; version: number }
  /** Not usable; `issues` are technical English details for the log and the error screen. */
  | { kind: 'invalid'; issues: string[] };

export interface ParseOptions {
  currentVersion?: number;
  migrations?: Readonly<Record<number, Migration>>;
}

function isRecord(value: unknown): value is RawData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function formatIssues(error: z.ZodError): string[] {
  return error.issues.map((i) => `${i.path.join('.') || '(root)'}: ${i.message}`);
}

function validate(raw: RawData): { data: DataFile } | { issues: string[] } {
  const result = body.safeParse(raw);
  if (!result.success) return { issues: formatIssues(result.error) };
  const data: DataFile = { ...result.data, schemaVersion: CURRENT_SCHEMA_VERSION };
  return { data };
}

/** Parses a data file's text: JSON → version check → migrations → validation (SPEC 4.4, 4.5). */
export function parseDataFile(text: string, options: ParseOptions = {}): ParseResult {
  const current = options.currentVersion ?? CURRENT_SCHEMA_VERSION;
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { kind: 'invalid', issues: ['(root): Not valid JSON'] };
  }
  if (!isRecord(raw) || raw.app !== APP_ID) {
    return { kind: 'invalid', issues: ['(root): Not a kalendar-vystavok data file'] };
  }
  const version = raw.schemaVersion;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { kind: 'invalid', issues: ['schemaVersion: Expected a positive integer'] };
  }

  if (version > current) {
    const v = validate(raw);
    return 'data' in v
      ? { kind: 'newer', data: v.data, version }
      : { kind: 'invalid', issues: v.issues };
  }

  let migrated: RawData = raw;
  if (version < current) {
    try {
      migrated = migrate(raw, version, current, options.migrations ?? MIGRATIONS);
    } catch (error: unknown) {
      return { kind: 'invalid', issues: [`schemaVersion: ${String(error)}`] };
    }
  }
  const v = validate(migrated);
  if (!('data' in v)) return { kind: 'invalid', issues: v.issues };
  return { kind: 'ok', data: v.data, migratedFrom: version < current ? version : null };
}

/** Serialises data the way it is written to disk and exported. */
export function serializeDataFile(data: DataFile): string {
  return `${JSON.stringify(data, null, 2)}\n`;
}
