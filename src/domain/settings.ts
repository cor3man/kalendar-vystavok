// Settings rules (SPEC 3.3, 5.4, 5.10). Pure: the current year is passed in, never read here.
import type { FormatId, Settings, WeekendTint } from './types.ts';

/** Named weekend tints (SPEC 3.3). */
export const WEEKEND_TINTS = { grey: '#EFEFEF', pink: '#FCE8F1' } as const;

/** Length of the recent-colours row (SPEC 5.4). */
export const MAX_RECENT_COLORS = 8;

/** Settings of 5.10 for new data folders; year and format come from the caller. */
export const DEFAULT_PREFERENCES = {
  selectionMode: 'click-shift',
  weekendTint: 'grey',
  heldMark: 'show',
  startup: 'last',
  recentColors: [],
} as const satisfies Omit<Settings, 'lastYear' | 'lastFormat'>;

/** The settings a user changes in the «Настройки» dialog. */
export type Preferences = Pick<Settings, 'selectionMode' | 'weekendTint' | 'heldMark' | 'startup'>;

/** Fill colour of Saturday and Sunday cells for a tint setting. */
export function weekendFill(tint: WeekendTint): string {
  if (tint === 'grey') return WEEKEND_TINTS.grey;
  if (tint === 'pink') return WEEKEND_TINTS.pink;
  return tint.toUpperCase();
}

/** Puts `hex` first in the recent list, without duplicates, keeping at most MAX_RECENT_COLORS. */
export function pushRecentColor(list: readonly string[], hex: string): string[] {
  const color = hex.toUpperCase();
  const rest = list.filter((c) => c.toUpperCase() !== color);
  return [color, ...rest].slice(0, MAX_RECENT_COLORS);
}

/** Year and format shown when the data opens (SPEC 5.10). */
export function startView(
  settings: Settings,
  currentYear: number,
): { year: number; format: FormatId } {
  return settings.startup === 'current'
    ? { year: currentYear, format: 'year' }
    : { year: settings.lastYear, format: settings.lastFormat };
}
