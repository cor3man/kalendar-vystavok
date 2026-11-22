// TEMPORARY (v1.1 colour comparison, SPEC 3.3): remove after the weekend tint is chosen.
import { COLORS, WEEKEND_TINTS, type WeekendTintId } from '../../layout/pageSpec.ts';

function isWeekendTintId(value: string | null): value is WeekendTintId {
  return value !== null && Object.hasOwn(WEEKEND_TINTS, value);
}

/**
 * `?weekendTint=grey|pink` → that tint; anything else → the default. The preview and the PDF
 * both pass `window.location.search`, so they always use the same tint.
 */
export function parseWeekendTint(search: string): string {
  const id = new URLSearchParams(search).get('weekendTint');
  return isWeekendTintId(id) ? WEEKEND_TINTS[id] : COLORS.weekendFill;
}
