import { describe, expect, it } from 'vitest';
import { COLORS, WEEKEND_TINTS } from '../../../src/layout/pageSpec.ts';
import { parseWeekendTint } from '../../../src/ui/calendar/weekendTintParam.ts';

describe('parseWeekendTint (temporary colour switch)', () => {
  it('picks a candidate by name', () => {
    expect(parseWeekendTint('?weekendTint=grey')).toBe(WEEKEND_TINTS.grey);
    expect(parseWeekendTint('?weekendTint=pink')).toBe(WEEKEND_TINTS.pink);
    expect(parseWeekendTint('?a=1&weekendTint=pink&b=2')).toBe(WEEKEND_TINTS.pink);
  });

  it('falls back to the default for a missing or unknown value', () => {
    for (const search of ['', '?weekendTint=', '?weekendTint=blue', '?weekendTint=toString'])
      expect(parseWeekendTint(search)).toBe(COLORS.weekendFill);
  });
});
