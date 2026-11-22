// SPEC 7.1 performance with 10 years of data (2 000 events, 300 exhibitions with logos):
// app start < 2 s, preview of a year with 200 events < 200 ms, PDF export < 3 s.
// Runs on the real data-folder adapter with an OPFS folder (see storage.spec.ts), in its own
// Playwright project after all other tests, so no parallel test competes for the CPU.
import { expect, test, type Page } from '@playwright/test';
import { ru } from '../../src/i18n/ru.ts';
import { serializeDataFile } from '../../src/storage/schema.ts';
import { BIG_FIRST_YEAR, buildBigData } from '../unit/helpers/bigData.ts';
import { collectErrors } from './helpers.ts';

const FOLDER = 'picked';
const START_BUDGET_MS = 2000;
const PREVIEW_BUDGET_MS = 200;
const PDF_BUDGET_MS = 3000;

test.use({ viewport: { width: 1280, height: 1100 } });

async function openBigFolder(page: Page): Promise<void> {
  await page.addInitScript((folder) => {
    const picker = async () =>
      (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true });
    Object.assign(window, { showDirectoryPicker: picker });
  }, FOLDER);
  await page.goto('./');
  const data = buildBigData();
  const text = serializeDataFile({
    ...data,
    settings: { lastYear: BIG_FIRST_YEAR, lastFormat: 'year' },
  });
  await page.evaluate(
    async ({ folder, text }) => {
      const dir = await (
        await navigator.storage.getDirectory()
      ).getDirectoryHandle(folder, {
        create: true,
      });
      const writable = await (
        await dir.getFileHandle('kalendar-data.json', { create: true })
      ).createWritable();
      await writable.write(text);
      await writable.close();
    },
    { folder: FOLDER, text },
  );
  await page.getByRole('button', { name: ru.start.open }).click();
  await expect(page.getByTestId('calendar-preview')).toBeVisible();
}

test('meets the performance budgets with 10 years of data', async ({ page }) => {
  const errors = collectErrors(page);
  await openBigFolder(page);
  await expect(page.getByTestId('event-list').getByRole('row')).toHaveCount(201); // + header

  // App start: reload with the remembered folder until the calendar is drawn.
  const t0 = Date.now();
  await page.reload();
  await expect(page.locator('[data-testid="calendar-preview"] svg text').first()).toBeVisible();
  const startMs = Date.now() - t0;

  // Preview: switch to the next year (layout + render of 200 other events) until it is drawn,
  // measured in the page. One warm-up switch, then the median of three.
  const switchMs = (year: number) =>
    page.evaluate(
      async ({ label, year }) => {
        const next = document.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`);
        if (next === null) throw new Error('No next-year button');
        const drawn = () =>
          Array.from(document.querySelectorAll('[data-testid="calendar-preview"] svg text')).some(
            (t) => t.textContent === year,
          );
        const t = performance.now();
        next.click();
        while (!drawn()) {
          await new Promise((r) => requestAnimationFrame(r));
        }
        return performance.now() - t;
      },
      { label: ru.toolbar.nextYear, year: String(year) },
    );
  await switchMs(BIG_FIRST_YEAR + 1);
  const runs: number[] = [];
  for (let i = 2; i <= 4; i++) runs.push(await switchMs(BIG_FIRST_YEAR + i));
  const previewMs = runs.sort((a, b) => a - b)[1] ?? Infinity;

  // PDF export: from the click to the finished file (incl. loading jsPDF and the fonts).
  const t1 = Date.now();
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: ru.pdf.download }).click();
  await (await downloading).path();
  const pdfMs = Date.now() - t1;

  console.log(
    `performance: start ${String(startMs)} ms, preview ${previewMs.toFixed(0)} ms, PDF ${String(pdfMs)} ms`,
  );
  expect(startMs).toBeLessThan(START_BUDGET_MS);
  expect(previewMs).toBeLessThan(PREVIEW_BUDGET_MS);
  expect(pdfMs).toBeLessThan(PDF_BUDGET_MS);
  expect(errors).toEqual([]);
});
