import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ru } from '../../src/i18n/ru.ts';
import { collectErrors, openWithSeed } from './helpers.ts';
import seed from '../../src/storage/seed.json' with { type: 'json' };

const MM_PER_PT = 25.4 / 72;

// SPEC 3.1 page sizes in mm.
const SIZE = {
  year: [420, 297],
  h1: [210, 297],
  h2: [210, 297],
  split: [420, 297],
} as const;

const firstHalf = seed.exhibitions.filter((e) => e.start < '2027-07-01');
const secondHalf = seed.exhibitions.filter((e) => e.start >= '2027-07-01');

const cases = [
  { format: 'year', file: 'Kalendar_2027_year.pdf', events: [...firstHalf, ...secondHalf] },
  { format: 'h1', file: 'Kalendar_2027_h1.pdf', events: firstHalf },
  { format: 'h2', file: 'Kalendar_2027_h2.pdf', events: secondHalf },
  { format: 'split', file: 'Kalendar_2027-2028_split.pdf', events: secondHalf },
] as const;

async function readPdf(data: Uint8Array) {
  const pdf = await getDocument({ data }).promise;
  const page = await pdf.getPage(1);
  const [x0 = 0, y0 = 0, x1 = 0, y1 = 0] = page.view;
  const content = await page.getTextContent();
  const text = content.items.map((i) => ('str' in i ? i.str : '')).join(' ');
  return { pages: pdf.numPages, w: (x1 - x0) * MM_PER_PT, h: (y1 - y0) * MM_PER_PT, text };
}

/** Text items are lines, so a wrapped name is checked word by word. */
function words(text: string): string[] {
  return text.split(/\s+/).filter((w) => w !== '');
}

for (const { format, file, events } of cases) {
  test(`downloads the ${format} PDF with the page size and event names`, async ({ page }) => {
    const errors = collectErrors(page);
    await openWithSeed(page);
    await page.getByLabel(ru.toolbar.format).selectOption(format);
    await expect(page.getByTestId('calendar-preview')).toHaveAttribute('data-format', format);

    const downloading = page.waitForEvent('download');
    await page.getByRole('button', { name: ru.pdf.download }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe(file);

    const pdf = await readPdf(new Uint8Array(await readFile(await download.path())));
    expect(pdf.pages).toBe(1);
    expect(pdf.w).toBeCloseTo(SIZE[format][0], 1);
    expect(pdf.h).toBeCloseTo(SIZE[format][1], 1);
    const found = new Set(words(pdf.text));
    for (const e of events) {
      for (const w of words(e.name)) expect(found, `${e.name}: ${w}`).toContain(w);
      expect(found, e.city).toContain(e.city);
    }
    await expect(page.getByRole('button', { name: ru.pdf.download })).toBeEnabled();
    expect(errors).toEqual([]);
  });
}

test('"Печать" opens the PDF in a new tab', async ({ page, context }) => {
  const errors = collectErrors(page);
  await openWithSeed(page);
  await expect(page.getByTestId('calendar-preview')).toBeVisible();

  const opening = context.waitForEvent('page');
  await page.getByRole('button', { name: ru.pdf.print }).click();
  const tab = await opening;
  // Headless Chromium has no PDF viewer: navigating the tab to the PDF turns into a download
  // from that tab. Desktop Chrome shows the PDF instead; either way the tab received the PDF.
  const download = await tab.waitForEvent('download');
  expect(download.url()).toMatch(/^blob:/);

  const pdf = await readPdf(new Uint8Array(await readFile(await download.path())));
  expect(pdf.w).toBeCloseTo(420, 1);
  expect(pdf.text).toContain('2027');
  expect(errors).toEqual([]);
});
