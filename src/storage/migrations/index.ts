// Migrations framework (SPEC 4.5): one pure function per version step, run in order on load.

/** Schema version written by this app version. */
export const CURRENT_SCHEMA_VERSION = 1;

/** Plain JSON object as read from disk, before validation. */
export type RawData = Record<string, unknown>;

/** Upgrades a file of version N to version N + 1. Must be pure and set `schemaVersion: N + 1`. */
export type Migration = (raw: RawData) => RawData;

/** Steps keyed by the version they upgrade from. Empty while the schema is at version 1. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = {};

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
