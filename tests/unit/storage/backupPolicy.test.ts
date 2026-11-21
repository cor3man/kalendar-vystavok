import { describe, expect, it } from 'vitest';
import {
  BACKUP_INTERVAL_MS,
  backupFileName,
  backupsToPrune,
  isBackupDue,
  parseBackupName,
  sortedBackups,
} from '../../../src/storage/backupPolicy.ts';
import { summarizeData } from '../../../src/storage/importSummary.ts';
import type { DataFile } from '../../../src/domain/types.ts';
import fixture from '../../fixtures/v1-minimal.json' with { type: 'json' };

// Local time on purpose: backup names are the user's wall-clock time.
const t = new Date(2027, 2, 14, 10, 22, 5).getTime();

describe('backup names', () => {
  it('formats the local time', () => {
    expect(backupFileName(t)).toBe('kalendar-data_2027-03-14_10-22-05.json');
    expect(backupFileName(t, 'invalid')).toBe('kalendar-data_invalid_2027-03-14_10-22-05.json');
  });

  it('parses its own names and ignores other files', () => {
    expect(parseBackupName(backupFileName(t))).toEqual({
      name: 'kalendar-data_2027-03-14_10-22-05.json',
      kind: 'normal',
      stamp: '2027-03-14 10:22:05',
    });
    expect(parseBackupName(backupFileName(t, 'invalid'))?.kind).toBe('invalid');
    expect(parseBackupName('notes.txt')).toBeNull();
    expect(parseBackupName('kalendar-data.json')).toBeNull();
  });
});

describe('backup rotation', () => {
  const names = Array.from({ length: 33 }, (_, i) => backupFileName(t + i * 1000));

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
