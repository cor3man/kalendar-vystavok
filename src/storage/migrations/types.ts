// Shared types of the migration steps (SPEC 4.5).

/** Plain JSON object as read from disk, before validation. */
export type RawData = Record<string, unknown>;

/** Upgrades a file of version N to version N + 1. Must be pure and set `schemaVersion: N + 1`. */
export type Migration = (raw: RawData) => RawData;
