// Migrations framework (SPEC 4.5): one pure function per version step, run in order on load.

import type { Migration, RawData } from './types.ts';
import { v1ToV2 } from './v1ToV2.ts';

export type { Migration, RawData } from './types.ts';

/** Schema version written by this app version. */
export const CURRENT_SCHEMA_VERSION = 2;

/** Steps keyed by the version they upgrade from. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = { 1: v1ToV2 };

export class MigrationError extends Error {
  override readonly name = 'MigrationError';
}

/** Runs the steps from `from` up to `to`. Throws when a step is missing or misbehaves. */
export function migrate(
  raw: RawData,
  from: number,
  to: number = CURRENT_SCHEMA_VERSION,
  steps: Readonly<Record<number, Migration>> = MIGRATIONS,
): RawData {
  let current = raw;
  for (let v = from; v < to; v++) {
    const step = steps[v];
    if (step === undefined) throw new MigrationError(`No migration from version ${String(v)}`);
    current = step(current);
    if (current.schemaVersion !== v + 1) {
      throw new MigrationError(
        `Migration from version ${String(v)} did not set version ${String(v + 1)}`,
      );
    }
  }
  return current;
}
