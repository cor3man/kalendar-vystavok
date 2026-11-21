// SPEC 7.2: add an exhibition with a logo and a country with a flag (file upload); catalogue
// rules (5.5, 4.1) and the holidays table (5.8).
import { crc32, deflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';
import { ru } from '../../src/i18n/ru.ts';
import { collectErrors, dragDays, openWithSeed } from './helpers.ts';

test.use({ viewport: { width: 1280, height: 1100 } });

/** A valid w × h PNG of one colour, built with zlib (no fixture file needed). */
function png(w: number, h: number): Buffer {
  const chunk = (type: string, data: Buffer) => {
    const body = Buffer.concat([Buffer.from(type, 'latin1'), data]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const header = Buffer.alloc(13);
  header.writeUInt32BE(w, 0);
  header.writeUInt32BE(h, 4);
  header.set([8, 2, 0, 0, 0], 8); // 8-bit RGB
  const row = Buffer.concat([Buffer.from([0]), Buffer.alloc(w * 3, 0xc0)]);
  const pixels = deflateSync(Buffer.concat(Array.from({ length: h }, () => row)));
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', header),
    chunk('IDAT', pixels),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const PNG = png(40, 20);
const SVG = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2"><rect width="3" height="2" fill="#00a050"/></svg>',
);

const preview = (page: Page) => page.getByTestId('calendar-preview').locator('svg').first();

async function openCatalogue(page: Page) {
  await page.getByRole('button', { name: ru.editing.catalogue }).click();
  return page.getByTestId('catalogue-dialog');
}

test('adds a country with a flag and an exhibition with a logo, then uses them', async ({
  page,
}) => {
  const errors = collectErrors(page);
  await openWithSeed(page);
  const catalogue = await openCatalogue(page);

  await catalogue.getByRole('tab', { name: ru.catalogue.countriesTab }).click();
  await catalogue.getByRole('button', { name: ru.catalogue.addCountry }).click();
  const countryForm = page.getByTestId('country-form');
  await countryForm.getByLabel(ru.catalogue.name).fill('Тестландия');
  await countryForm
    .getByTestId('flag-file')
    .setInputFiles({ name: 'flag.svg', mimeType: 'image/svg+xml', buffer: SVG });
  await expect(countryForm.getByTestId('flag-file-preview')).toBeVisible();
  await countryForm.getByRole('button', { name: ru.common.save }).click();
  await expect(countryForm).toBeHidden();
  const countryRow = page.getByTestId('country-table').getByRole('row', { name: /Тестландия/ });
  await expect(countryRow.getByRole('img')).toBeVisible();

  await catalogue.getByRole('tab', { name: ru.catalogue.exhibitionsTab }).click();
  await catalogue.getByRole('button', { name: ru.catalogue.addExhibition }).click();
  const form = page.getByTestId('exhibition-form');
  await form.getByLabel(ru.catalogue.name, { exact: true }).fill('Expo Test');
  await form.getByRole('textbox', { name: ru.catalogue.shortName }).fill('Expo\nTest');
  await form
    .getByTestId('logo-file')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: PNG });
  await expect(form.getByTestId('logo-file-preview')).toBeVisible();
  await form.getByLabel(ru.catalogue.defaultCity).fill('Тестбург');
  await form.getByRole('combobox', { name: ru.catalogue.defaultCountry }).click();
  await page.getByRole('option', { name: 'Тестландия' }).click();
  // Live preview of the short name in a 3-day cell.
  const namePreview = form.getByTestId('short-name-preview');
  await expect(namePreview.locator('text', { hasText: /^Expo$/ })).toBeAttached();
  await expect(namePreview.locator('text', { hasText: /^Test$/ })).toBeAttached();
  await form.getByRole('button', { name: ru.common.save }).click();
  await expect(form).toBeHidden();
  await expect(
    page.getByTestId('exhibition-table').getByRole('row', { name: /Expo Test/ }),
  ).toContainText('Тестбург');
  await catalogue.getByRole('button', { name: ru.common.close }).click();

  const imagesBefore = await preview(page).locator('image').count();
  await dragDays(page, '2027-09-01', '2027-09-06');
  const dialog = page.getByTestId('event-dialog');
  await dialog.getByRole('combobox', { name: ru.eventDialog.exhibition }).fill('Expo');
  await page.getByRole('option', { name: 'Expo Test' }).click();
  await expect(dialog.getByRole('combobox', { name: ru.eventDialog.country })).toContainText(
    'Тестландия',
  );
  await dialog.getByRole('button', { name: ru.common.save }).click();
  await expect(dialog).toBeHidden();
  // Logo and flag are drawn in the preview.
  await expect(preview(page).locator('image')).toHaveCount(imagesBefore + 2);
  await expect(preview(page).locator('text', { hasText: /^Тестбург$/ })).toBeAttached();
  expect(errors).toEqual([]);
});

test('explains why an exhibition or a country in use cannot be deleted', async ({ page }) => {
  await openWithSeed(page);
  const catalogue = await openCatalogue(page);
  await catalogue.getByRole('button', { name: `${ru.common.delete}: ТрансРоссия` }).click();
  await expect(catalogue.getByRole('alert')).toContainText(ru.editErrors.inUse);
  await expect(catalogue.getByRole('alert')).toContainText('16–18 марта 2027');

  await catalogue.getByRole('tab', { name: ru.catalogue.countriesTab }).click();
  await catalogue.getByRole('button', { name: `${ru.common.delete}: Германия` }).click();
  await expect(catalogue.getByRole('alert')).toContainText('Transport logistic');
  // An unused country can be deleted.
  await catalogue.getByRole('button', { name: `${ru.common.delete}: Польша` }).click();
  await expect(page.getByTestId('country-table')).not.toContainText('Польша');
});

test('refuses a duplicate exhibition name and a bad image', async ({ page }) => {
  await openWithSeed(page);
  const catalogue = await openCatalogue(page);
  await catalogue.getByRole('button', { name: ru.catalogue.addExhibition }).click();
  const form = page.getByTestId('exhibition-form');
  await form.getByLabel(ru.catalogue.name, { exact: true }).fill('трансроссия');
  await form
    .getByTestId('logo-file')
    .setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from('nope') });
  await expect(form.getByRole('alert')).toHaveText(ru.catalogue.imageUnreadable);
  await form.getByRole('button', { name: ru.common.save }).click();
  await expect(form.getByRole('alert').filter({ hasText: ru.editErrors.nameTaken })).toBeVisible();
});

test('edits holidays: delete, add with a label, fill the Belarus defaults', async ({ page }) => {
  await openWithSeed(page);
  await expect(preview(page).locator('text', { hasText: /^7 ноября$/ })).toBeAttached();
  await page.getByRole('button', { name: ru.editing.holidays }).click();
  const dialog = page.getByTestId('holidays-dialog');
  const year = dialog.getByTestId('holidays-2027');

  await year.getByRole('button', { name: ru.holidays.deleteLabel('07.11.2027') }).click();
  await year.getByLabel(ru.holidays.date).fill('2027-10-01');
  await year.getByLabel(ru.holidays.label, { exact: true }).fill('Тест');
  await year.getByRole('button', { name: ru.common.add }).click();
  await expect(year.getByLabel(`${ru.holidays.label} 01.10.2027`)).toHaveValue('Тест');
  await dialog.getByRole('button', { name: ru.common.close }).click();

  await expect(preview(page).locator('text', { hasText: /^7 ноября$/ })).toHaveCount(0);
  await expect(preview(page).locator('text', { hasText: /^Тест$/ })).toBeAttached();

  await page.getByRole('button', { name: ru.editing.holidays }).click();
  await year.getByRole('button', { name: ru.holidays.fill }).click();
  await expect(year).toContainText(ru.holidays.filled(1));
  await year.getByRole('button', { name: ru.holidays.fill }).click();
  await expect(year).toContainText(ru.holidays.nothingToFill);
});
