import { describe, expect, it } from 'vitest';
import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  MigrationError,
  migrate,
} from '../../../../src/storage/migrations/index.ts';

describe('migrate', () => {
  it('is a no-op at the current version', () => {
    const raw = { schemaVersion: CURRENT_SCHEMA_VERSION };
    expect(migrate(raw, CURRENT_SCHEMA_VERSION)).toBe(raw);
  });

  it('has a step for every version below the current one', () => {
    for (let v = 1; v < CURRENT_SCHEMA_VERSION; v++) expect(MIGRATIONS[v]).toBeTypeOf('function');
  });

  it('runs the steps in order', () => {
    const order: number[] = [];
    const out = migrate({ schemaVersion: 1, log: [] }, 1, 3, {
      1: (raw) => {
        order.push(1);
        return { ...raw, schemaVersion: 2 };
      },
      2: (raw) => {
        order.push(2);
        return { ...raw, schemaVersion: 3 };
      },
    });
    expect(order).toEqual([1, 2]);
    expect(out.schemaVersion).toBe(3);
  });

  it('fails on a missing step', () => {
    expect(() => migrate({ schemaVersion: 1 }, 1, 2, {})).toThrow(MigrationError);
  });

  it('fails on a step that does not bump the version', () => {
    expect(() => migrate({ schemaVersion: 1 }, 1, 2, { 1: (raw) => raw })).toThrow(
      'did not set version 2',
    );
  });
});
