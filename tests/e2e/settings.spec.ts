// SPEC 5.10 settings and the 5.4 colour picker (M6).
import { readFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { getDocument, OPS } from 'pdfjs-dist/legacy/build/pdf.mjs';
import { ru } from '../../src/i18n/ru.ts';
import { changeSettings, clickDay, collectErrors, openWithSeed } from './helpers.ts';

test.use({ viewport: { width: 1280, height: 1100 } });

const GREY = '#EFEFEF';
const PINK = '#FCE8F1';
const FOLDER = 'picked';

const preview = (page: Page) => page.getByTestId('calendar-preview').locator('svg').first();
const eventDialog = (page: Page) => page.getByTestId('event-dialog');

/** Rect fills of the preview, upper case. */
async function previewFills(page: Page): Promise<Set<string>> {
  const fills = await preview(page)
    .locator('rect')
    .evaluateAll((rects) => rects.map((r) => (r.getAttribute('fill') ?? '').toUpperCase()));
  return new Set(fills);
}

/** jsPDF writes colours with limited precision: compare each channel within 2 of 255. */
function hasColor(fills: Set<string>, hex: string): boolean {
  const rgb = (h: string) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const want = rgb(hex);
  return [...fills].some((f) => rgb(f).every((c, i) => Math.abs(c - (want[i] ?? 0)) <= 2));
}

interface PdfSummary {
  fills: Set<string>;
  /** Number of drawing operators: an extra check mark adds some. */
  ops: number;
}

async function downloadPdf(page: Page): Promise<PdfSummary> {
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: ru.pdf.download }).click();
  const data = new Uint8Array(await readFile(await (await downloading).path()));
  const pdfPage = await (await getDocument({ data }).promise).getPage(1);
  const list = await pdfPage.getOperatorList();
  const fills = new Set<string>();
  list.fnArray.forEach((fn, i) => {
    if (fn !== OPS.setFillRGBColor) return;
    const arg: unknown = (list.argsArray[i] as unknown[] | null)?.[0];
    if (typeof arg === 'string') fills.add(arg.toUpperCase());
  });
  return { fills, ops: list.fnArray.length };
}

/** Real File System Access adapter on OPFS, so settings survive a reload (as in storage.spec). */
async function createRealFolder(page: Page) {
  await page.addInitScript((folder) => {
    const picker = async () =>
      (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true });
    Object.assign(window, { showDirectoryPicker: picker });
  }, FOLDER);
  await page.goto('./');
  await page.getByRole('button', { name: ru.start.create }).click();
  await expect(page.getByTestId('calendar-preview')).toBeVisible();
}

async function waitSaved(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');
}

test('settings apply at once, are saved and survive a reload', async ({ page }) => {
  const errors = collectErrors(page);
  await createRealFolder(page);
  expect(await previewFills(page)).toContain(GREY);

  await changeSettings(page, async (dialog) => {
    await dialog.getByRole('radio', { name: ru.settings.tintPink }).check();
    // Applies at once, while the dialog is still open.
    expect(await previewFills(page)).toContain(PINK);
    await dialog.getByRole('radio', { name: ru.settings.selectionDrag }).check();
    await dialog.getByRole('checkbox', { name: ru.settings.heldMark }).uncheck();
  });
  expect(await previewFills(page)).not.toContain(GREY);
  // Not undo steps.
  await expect(page.getByRole('button', { name: ru.editing.undo })).toBeDisabled();
  await waitSaved(page);

  await page.reload();
  await expect(page.getByTestId('calendar-preview')).toBeVisible();
  expect(await previewFills(page)).toContain(PINK);
  await changeSettings(page, async (dialog) => {
    await expect(dialog.getByRole('radio', { name: ru.settings.tintPink })).toBeChecked();
    await expect(dialog.getByRole('radio', { name: ru.settings.selectionDrag })).toBeChecked();
    await expect(dialog.getByRole('checkbox', { name: ru.settings.heldMark })).not.toBeChecked();
  });
  expect(errors).toEqual([]);
});

test("startup 'current' opens the current year in the year format", async ({ page }) => {
  await page.clock.install({ time: new Date(2031, 5, 1, 12) });
  await createRealFolder(page);
  await changeSettings(page, (dialog) =>
    dialog.getByRole('radio', { name: ru.settings.startupCurrent }).check(),
  );
  await page.getByLabel(ru.toolbar.format).selectOption('h1');
  await page.getByRole('spinbutton').fill('2027');
  await waitSaved(page);

  await page.reload();
  await expect(page.getByTestId('calendar-preview')).toHaveAttribute('data-format', 'year');
  await expect(page.getByRole('spinbutton')).toHaveValue('2031');
});

test('the weekend tint and the held mark reach the PDF', async ({ page }) => {
  await openWithSeed(page);
  const grey = await downloadPdf(page);
  expect(hasColor(grey.fills, GREY)).toBe(true);
  expect(hasColor(grey.fills, PINK)).toBe(false);

  // A custom tint picked in the settings.
  await changeSettings(page, async (dialog) => {
    await dialog.getByRole('radio', { name: ru.settings.tintCustom }).check();
    await dialog.getByRole('radio', { name: ru.colorPicker.cell(ru.colorHues.green, 1) }).click();
  });
  expect(await previewFills(page)).toContain('#E6F4E3');
  const custom = await downloadPdf(page);
  expect(hasColor(custom.fills, '#E6F4E3')).toBe(true);
  expect(hasColor(custom.fills, GREY)).toBe(false);

  // Mark ТрансРоссия held: the ✓ is drawn, then hidden with the setting.
  await clickDay(page, '2027-03-17');
  await eventDialog(page).getByRole('checkbox', { name: ru.eventDialog.held }).check();
  await eventDialog(page).getByRole('button', { name: ru.common.save }).click();
  await expect(preview(page).locator('polyline')).toHaveCount(1);
  const shown = await downloadPdf(page);
  await changeSettings(page, (dialog) =>
    dialog.getByRole('checkbox', { name: ru.settings.heldMark }).uncheck(),
  );
  await expect(preview(page).locator('polyline')).toHaveCount(0);
  const hidden = await downloadPdf(page);
  expect(hidden.ops).toBeLessThan(shown.ops);
});

test('colour picker: grid by keyboard, recent colours, light-only sliders', async ({ page }) => {
  await openWithSeed(page);
  await clickDay(page, '2027-03-17');
  const dialog = eventDialog(page);
  const grid = dialog.getByTestId('color-grid');
  await expect(grid.getByRole('radio')).toHaveCount(40);
  // ТрансРоссия is «Сиреневый» of v1.1, cell lilac 4.
  const selected = grid.getByRole('radio', { checked: true });
  await expect(selected).toHaveAccessibleName(ru.colorPicker.cell(ru.colorHues.lilac, 4));
  await expect(dialog.getByTestId('color-recent')).toHaveCount(0);

  // Arrow keys move the focus; Enter picks.
  await selected.focus();
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowLeft');
  await expect(
    grid.getByRole('radio', { name: ru.colorPicker.cell(ru.colorHues.blue, 3) }),
  ).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(grid.getByRole('radio', { checked: true })).toHaveAccessibleName(
    ru.colorPicker.cell(ru.colorHues.blue, 3),
  );

  // «Другой цвет…»: the sliders give a light colour.
  await dialog.getByRole('button', { name: ru.colorPicker.more }).click();
  const light = dialog.getByRole('slider', { name: ru.colorPicker.lightness });
  await expect(light).toHaveAttribute('min', '63');
  await expect(light).toHaveAttribute('max', '95');
  await light.fill('63');
  await dialog.getByRole('slider', { name: ru.colorPicker.hue }).fill('20');
  const custom = await dialog.getByTestId('custom-color-preview').getAttribute('data-color');
  expect(custom).toMatch(/^#[0-9A-F]{6}$/);
  await expect(grid.getByRole('radio', { checked: true })).toHaveCount(0);
  await dialog.getByRole('button', { name: ru.common.save }).click();
  await expect(dialog).toBeHidden();

  // The saved colour is the first recent colour next time.
  await clickDay(page, '2027-03-17');
  const recent = eventDialog(page).getByTestId('color-recent').getByRole('radio');
  await expect(recent).toHaveCount(1);
  await expect(recent.first()).toHaveAttribute('aria-checked', 'true');
  await expect(recent.first()).toHaveAccessibleName(custom ?? '');
});
