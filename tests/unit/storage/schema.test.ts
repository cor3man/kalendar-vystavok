import { describe, expect, it } from 'vitest';
import { buildSeed } from '../../../src/storage/seed.ts';
import { parseDataFile, serializeDataFile } from '../../../src/storage/schema.ts';
import type { RawData } from '../../../src/storage/migrations/index.ts';
import fixture from '../../fixtures/v2-minimal.json' with { type: 'json' };

const seed = buildSeed({
  currentYear: 2026,
  appVersion: '0.4.0',
  savedAt: '2026-11-21T10:00:00.000Z',
});

function withChange(change: (raw: RawData) => void): string {
  const raw = structuredClone(fixture) as RawData;
  change(raw);
  return JSON.stringify(raw);
}

function issuesOf(text: string): string[] {
  const r = parseDataFile(text);
  if (r.kind !== 'invalid') throw new Error(`expected invalid, got ${r.kind}`);
  return r.issues;
}

/** Item `i` of a list field of the raw fixture. */
function item(raw: RawData, key: string, i = 0): RawData {
  const list = raw[key] as RawData[];
  const found = list[i];
  if (found === undefined) throw new Error(`no ${key}[${String(i)}]`);
  return found;
}

describe('parseDataFile', () => {
  it('accepts the v2 fixture unchanged', () => {
    const r = parseDataFile(JSON.stringify(fixture));
    expect(r).toEqual({ kind: 'ok', data: fixture, migratedFrom: null });
  });

  it('accepts the seed data and round-trips through serializeDataFile', () => {
    const r = parseDataFile(serializeDataFile(seed));
    expect(r).toEqual({ kind: 'ok', data: seed, migratedFrom: null });
  });

  it('accepts a custom weekend tint', () => {
    const r = parseDataFile(
      withChange((raw) => ((raw.settings as RawData).weekendTint = '#E4DFF6')),
    );
    expect(r.kind === 'ok' && r.data.settings.weekendTint).toBe('#E4DFF6');
  });

  it('strips unknown fields', () => {
    const r = parseDataFile(withChange((raw) => (raw.extra = 1)));
    expect(r.kind === 'ok' && 'extra' in r.data).toBe(false);
  });

  it('rejects text that is not JSON or not our file', () => {
    expect(issuesOf('{oops')).toEqual(['(root): Not valid JSON']);
    expect(issuesOf('[]')).toEqual(['(root): Not a kalendar-vystavok data file']);
    expect(issuesOf(withChange((raw) => (raw.app = 'other')))).toHaveLength(1);
  });

  it('rejects a missing or bad schemaVersion', () => {
    for (const v of [undefined, 0, 1.5, '1']) {
      expect(issuesOf(withChange((raw) => (raw.schemaVersion = v)))).toEqual([
        'schemaVersion: Expected a positive integer',
      ]);
    }
  });

  it.each([
    [
      'bad weekend tint',
      (raw: RawData) => ((raw.settings as RawData).weekendTint = 'blue'),
      'settings.weekendTint',
    ],
    [
      'bad selection mode',
      (raw: RawData) => ((raw.settings as RawData).selectionMode = 'tap'),
      'settings.selectionMode',
    ],
    [
      'bad held mark',
      (raw: RawData) => ((raw.settings as RawData).heldMark = 'hide'),
      'settings.heldMark',
    ],
    [
      'bad startup',
      (raw: RawData) => ((raw.settings as RawData).startup = 'never'),
      'settings.startup',
    ],
    [
      'too many recent colours',
      (raw: RawData) => ((raw.settings as RawData).recentColors = Array<string>(9).fill('#EFEFEF')),
      'settings.recentColors',
    ],
    [
      'duplicate recent colours',
      (raw: RawData) => ((raw.settings as RawData).recentColors = ['#efefef', '#EFEFEF']),
      'settings.recentColors',
    ],
    ['bad date', (raw: RawData) => (item(raw, 'events').start = '2027-02-30'), 'events.0.start'],
    [
      'end before start',
      (raw: RawData) => (item(raw, 'events').end = '2027-03-01'),
      'events.0.end',
    ],
    ['bad colour', (raw: RawData) => (item(raw, 'events').color = 'red'), 'events.0.color'],
    ['missing field', (raw: RawData) => delete item(raw, 'events').held, 'events.0.held'],
    [
      'unknown exhibition',
      (raw: RawData) => (item(raw, 'events').exhibitionId = 'nope'),
      'events.0.exhibitionId',
    ],
    [
      'unknown country',
      (raw: RawData) => (item(raw, 'events').countryId = 'xx'),
      'events.0.countryId',
    ],
    [
      'unknown default country',
      (raw: RawData) => (item(raw, 'exhibitions').defaultCountryId = 'xx'),
      'exhibitions.0.defaultCountryId',
    ],
    ['duplicate id', (raw: RawData) => (item(raw, 'events').id = 'ex-a'), 'events.0.id'],
    [
      'image that is not PNG or SVG',
      (raw: RawData) =>
        ((item(raw, 'countries', 1).flag as RawData).dataUrl = 'data:image/gif;base64,'),
      'countries.1.flag.dataUrl',
    ],
    [
      'bad format',
      (raw: RawData) => ((raw.settings as RawData).lastFormat = 'a5'),
      'settings.lastFormat',
    ],
  ])('rejects %s', (_name, change, path) => {
    const issues = issuesOf(withChange(change));
    expect(issues.some((i) => i.startsWith(`${path}:`))).toBe(true);
  });

  it('opens a newer version read-only when it still has the current shape', () => {
    const r = parseDataFile(withChange((raw) => (raw.schemaVersion = 3)));
    expect(r).toEqual({ kind: 'newer', data: fixture, version: 3 });
  });

  it('rejects a newer version that no longer has the current shape', () => {
    const r = parseDataFile(
      withChange((raw) => {
        raw.schemaVersion = 4;
        delete raw.events;
      }),
    );
    expect(r.kind).toBe('invalid');
  });

  it('migrates an older version before validating it', () => {
    // Pretend the app is at version 3, where events gained a field; the v2 fixture is "old".
    const r = parseDataFile(JSON.stringify(fixture), {
      currentVersion: 3,
      migrations: { 2: (raw) => ({ ...raw, schemaVersion: 3, migrated: true }) },
    });
    expect(r.kind).toBe('ok');
    expect(r.kind === 'ok' && r.migratedFrom).toBe(2);
  });

  it('reports a failed migration as invalid', () => {
    const r = parseDataFile(JSON.stringify(fixture), { currentVersion: 3, migrations: {} });
    expect(r).toEqual({
      kind: 'invalid',
      issues: ['schemaVersion: MigrationError: No migration from version 2'],
    });
  });

  it('reports a migrated file that fails validation as invalid', () => {
    const r = parseDataFile(JSON.stringify(fixture), {
      currentVersion: 3,
      migrations: { 2: (raw) => ({ ...raw, schemaVersion: 3, events: null }) },
    });
    expect(r.kind).toBe('invalid');
  });
});
