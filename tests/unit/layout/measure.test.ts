import { describe, expect, it } from 'vitest';
import { createFontkitMeasurer } from '../helpers/fontkitMeasurer.ts';

// SPEC 3.7: jsPDF does not kern, so text is measured without kerning everywhere.
describe('test measurer', () => {
  const m = createFontkitMeasurer();

  it.each([false, true])('ignores kerning (bold: %s)', (bold) => {
    // "AV" is a kerned pair in PT Sans Narrow.
    expect(m.width('AV', 10, bold)).toBeCloseTo(m.width('A', 10, bold) + m.width('V', 10, bold), 9);
  });

  it('scales linearly with the size', () => {
    expect(m.width('ТрансРоссия', 3, true)).toBeCloseTo(m.width('ТрансРоссия', 1, true) * 3, 9);
  });
});
