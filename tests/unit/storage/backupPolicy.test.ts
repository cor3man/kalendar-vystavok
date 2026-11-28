import { describe, expect, it } from 'vitest';
import {
  BACKUP_INTERVAL_MS,
  backupFileName,
  backupsToPrune,
  isBackupDue,
  parseBackupName,
  sortedBackups,
  uniqueBackupName,
} from '../../../src/storage/backupPolicy.ts';
import { summarizeData } from '../../../src/storage/importSummary.ts';
import type { DataFile } from '../../../src/domain/types.ts';
import fixture from '../../fixtures/v2-minimal.json' with { type: 'json' };

// Local time on purpose: backup names are the user's wall-clock time.
const t = new Date(2027, 2, 14, 10, 22, 5, 42).getTime();

describe('backup names', () => {
  it('formats the local time', () => {
    expect(backupFileName(t)).toBe('kalendar-data_2027-03-14_10-22-05-042.json');
    expect(backupFileName(t, 'invalid')).toBe('kalendar-data_invalid_2027-03-14_10-22-05-042.json');
  });

  it('adds a counter when the name is taken, never reusing an existing name', () => {
    const first = backupFileName(t);
    expect(uniqueBackupName(t, 'normal', [])).toBe(first);
    expect(uniqueBackupName(t, 'normal', [first])).toBe(
      'kalendar-data_2027-03-14_10-22-05-042_2.json',
    );
    expect(
      uniqueBackupName(t, 'normal', [
        first,
        'kalendar-data_2027-03-14_10-22-05-042_2.json',
        'kalendar-data_2027-03-14_10-22-05-042_3.json',
      ]),
    ).toBe('kalendar-data_2027-03-14_10-22-05-042_4.json');
    // An invalid copy and a normal backup of the same moment do not collide.
    expect(uniqueBackupName(t, 'invalid', [first])).toBe(backupFileName(t, 'invalid'));
  });

  it('parses its own names and ignores other files', () => {
    expect(parseBackupName(backupFileName(t))).toEqual({
      name: 'kalendar-data_2027-03-14_10-22-05-042.json',
      kind: 'normal',
      stamp: '2027-03-14 10:22:05',
      order: '2027-03-14 10:22:05.042 0001',
    });
    expect(parseBackupName('kalendar-data_2027-03-14_10-22-05-042_12.json')?.order).toBe(
      '2027-03-14 10:22:05.042 0012',
    );
    expect(parseBackupName(backupFileName(t, 'invalid'))?.kind).toBe('invalid');
    expect(parseBackupName('notes.txt')).toBeNull();
    expect(parseBackupName('kalendar-data.json')).toBeNull();
  });
});

describe('backup rotation', () => {
  const names = Array.from({ length: 33 }, (_, i) => backupFileName(t + i * 1000));

  it('sorts by milliseconds and counter, not by the shown second', () => {
    const sameSecond = [
      'kalendar-data_2027-03-14_10-22-05-042_2.json',
      'kalendar-data_2027-03-14_10-22-05-900.json',
      'kalendar-data_2027-03-14_10-22-05-042_10.json',
      'kalendar-data_2027-03-14_10-22-05-042.json',
    ];
    expect(sortedBackups(sameSecond).map((b) => b.name)).toEqual([
      'kalendar-data_2027-03-14_10-22-05-900.json',
      'kalendar-data_2027-03-14_10-22-05-042_10.json',
      'kalendar-data_2027-03-14_10-22-05-042_2.json',
      'kalendar-data_2027-03-14_10-22-05-042.json',
    ]);
  });

  it('sorts normal backups newest first, without invalid copies or other files', () => {
    const sorted = sortedBackups([
      ...names.slice(0, 3),
      backupFileName(t + 9e6, 'invalid'),
      'x.json',
    ]);
    expect(sorted.map((b) => b.name)).toEqual([names[2], names[1], names[0]]);
  });

  it('prunes everything beyond the newest 30', () => {
    const invalid = backupFileName(t - 1000, 'invalid');
    expect(backupsToPrune([...names, invalid])).toEqual([names[2], names[1], names[0]]);
    expect(backupsToPrune(names.slice(0, 30))).toEqual([]);
  });

  it('allows one backup per 10 minutes', () => {
    expect(isBackupDue(null, t)).toBe(true);
    expect(isBackupDue(t, t + BACKUP_INTERVAL_MS - 1)).toBe(false);
    expect(isBackupDue(t, t + BACKUP_INTERVAL_MS)).toBe(true);
  });
});

describe('summarizeData', () => {
  it('counts each entity', () => {
    expect(summarizeData(fixture as DataFile)).toEqual({
      exhibitions: 1,
      events: 1,
      countries: 2,
      holidays: 1,
    });
  });
});
