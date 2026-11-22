// SPEC 7.1 performance: layout of a year with 200 events < 200 ms, with 10 years of data loaded.
import { describe, expect, it } from 'vitest';
import { layoutCalendar } from '../../../src/layout/layout.ts';
import { FORMAT_IDS } from '../../../src/layout/pageSpec.ts';
import { parseDataFile, serializeDataFile } from '../../../src/storage/schema.ts';
import { BIG_FIRST_YEAR, buildBigData } from '../helpers/bigData.ts';
import { createFontkitMeasurer } from '../helpers/fontkitMeasurer.ts';

const data = buildBigData();
const measurer = createFontkitMeasurer();
const BUDGET_MS = 200;

function timeLayout(format: (typeof FORMAT_IDS)[number]): number {
  const t0 = performance.now();
  layoutCalendar({ data, year: BIG_FIRST_YEAR + 3, format, exportDate: '2026-11-22', measurer });
  return performance.now() - t0;
}

describe('performance (SPEC 7.1)', () => {
  it('the big data set is a valid data file of the stated size', () => {
    expect(parseDataFile(serializeDataFile(data)).kind).toBe('ok');
    expect(data.events.length).toBe(2000);
    expect(data.exhibitions.length).toBeGreaterThanOrEqual(300);
  });

  it.each(FORMAT_IDS)('layout of %s with 200 events per year stays under budget', (format) => {
    timeLayout(format); // warm-up: JIT and measurer caches
    const runs = [timeLayout(format), timeLayout(format), timeLayout(format)];
    expect(Math.min(...runs)).toBeLessThan(BUDGET_MS);
  });
});
