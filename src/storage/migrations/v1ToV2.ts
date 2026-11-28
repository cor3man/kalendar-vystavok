// v1 → v2 (SPEC 4.5, M6): adds the settings of 5.10.
import type { Migration, RawData } from './types.ts';

function isRecord(value: unknown): value is RawData {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * v1 files were printed with the pink weekend tint, so they keep it; new data folders get grey.
 * Fields already present are kept, so a hand-edited file is not overwritten.
 */
export const v1ToV2: Migration = (raw) => {
  const settings = isRecord(raw.settings) ? raw.settings : {};
  return {
    ...raw,
    schemaVersion: 2,
    settings: {
      selectionMode: 'click-shift',
      weekendTint: 'pink',
      heldMark: 'show',
      startup: 'last',
      recentColors: [],
      ...settings,
    },
  };
};
