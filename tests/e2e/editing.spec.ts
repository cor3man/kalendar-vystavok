// SPEC 7.2 editing flows: selecting days, the event dialog, held mark, delete + undo, copy,
// warnings, undo / redo shortcuts (memory storage, seed data, 2027 year view).
import { expect, test, type Page } from '@playwright/test';
import { ru } from '../../src/i18n/ru.ts';
import {
  clickDay,
  collectErrors,
  dayPoint,
  dragDays,
  openWithSeed,
  showPreview,
} from './helpers.ts';

// Tall enough to show the whole A3 page at once, so drags can span the grid.
test.use({ viewport: { width: 1280, height: 1100 } });

const preview = (page: Page) => page.getByTestId('calendar-preview').locator('svg').first();
const dialog = (page: Page) => page.getByTestId('event-dialog');
const list = (page: Page) => page.getByTestId('event-list');

async function pickExhibition(page: Page, typed: string, option: string | RegExp) {
  await dialog(page).getByRole('combobox', { name: ru.eventDialog.exhibition }).fill(typed);
  await page.getByRole('option', { name: option }).click();
}

async function save(page: Page) {
  await dialog(page).getByRole('button', { name: ru.common.save }).click();
  await expect(dialog(page)).toBeHidden();
}

test('creates an event by dragging 3 days', async ({ page }) => {
  const errors = collectErrors(page);
  await openWithSeed(page);
  await dragDays(page, '2027-08-10', '2027-08-12');

  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByLabel(ru.eventDialog.start)).toHaveValue('2027-08-10');
  await expect(dialog(page).getByLabel(ru.eventDialog.end)).toHaveValue('2027-08-12');
  await pickExhibition(page, 'Transport log', 'Transport logistic');
  // Picking prefills city, country and colour from the catalogue.
  await expect(dialog(page).getByLabel(ru.eventDialog.city)).toHaveValue('Мюнхен');
  await save(page);

  const row = list(page).getByRole('row', { name: /10–12 августа 2027/ });
  await expect(row).toContainText('Transport logistic');
  await expect(row).toContainText('Германия');
  await expect(preview(page).locator('text', { hasText: /^Мюнхен$/ })).toHaveCount(2);
  expect(errors).toEqual([]);
});

test('selects across a month boundary and creates a new exhibition', async ({ page }) => {
  await openWithSeed(page);
  await showPreview(page);
  const a = await dayPoint(page, '2027-07-30');
  const b = await dayPoint(page, '2027-08-02');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await expect(page.getByTestId('selection-tooltip')).toHaveText('30 июля – 2 августа 2027');
  await expect(page.getByTestId('selection-highlight')).toHaveCount(2);
  await page.mouse.up();

  await pickExhibition(page, 'Новая выставка', ru.eventDialog.createExhibition('Новая выставка'));
  await dialog(page).getByLabel(ru.eventDialog.city).fill('Минск');
  await save(page);
  await expect(list(page).getByRole('row', { name: /Новая выставка/ })).toContainText(
    '30 июля – 2 августа 2027',
  );

  await page.getByRole('button', { name: ru.editing.catalogue }).click();
  await expect(page.getByTestId('exhibition-table')).toContainText('Новая выставка');
});

test('Esc cancels a drag', async ({ page }) => {
  await openWithSeed(page);
  await showPreview(page);
  const a = await dayPoint(page, '2027-09-10');
  const b = await dayPoint(page, '2027-09-12');
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 4 });
  await page.keyboard.press('Escape');
  await page.mouse.up();
  await expect(page.getByTestId('selection-highlight')).toHaveCount(0);
  await expect(dialog(page)).toBeHidden();
});

test('a click on an empty day starts a one-day event', async ({ page }) => {
  await openWithSeed(page);
  await clickDay(page, '2027-09-07');
  await expect(dialog(page).getByLabel(ru.eventDialog.start)).toHaveValue('2027-09-07');
  await expect(dialog(page).getByLabel(ru.eventDialog.end)).toHaveValue('2027-09-07');
  await page.keyboard.press('Escape');
  await expect(dialog(page)).toBeHidden();
});

test('edits an event by clicking it and marks it held', async ({ page }) => {
  await openWithSeed(page);
  await expect(preview(page).locator('polyline')).toHaveCount(0);
  await clickDay(page, '2027-03-17');
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByRole('combobox', { name: ru.eventDialog.exhibition })).toHaveValue(
    'ТрансРоссия',
  );
  await dialog(page).getByLabel(ru.eventDialog.held).check();
  await save(page);
  await expect(preview(page).locator('polyline')).toHaveCount(1);
  await expect(list(page).getByRole('row', { name: /ТрансРоссия/ })).toContainText(
    ru.eventList.held,
  );
});

test('deletes an event and undoes it from the toast', async ({ page }) => {
  await openWithSeed(page);
  await clickDay(page, '2027-03-17');
  await dialog(page).getByRole('button', { name: ru.common.delete }).click();
  await expect(list(page)).not.toContainText('ТрансРоссия');
  const toast = page.getByTestId('delete-toast');
  await expect(toast).toContainText(ru.eventDialog.deleted);
  await toast.getByRole('button', { name: ru.eventDialog.undoDelete }).click();
  await expect(toast).toBeHidden();
  await expect(list(page)).toContainText('ТрансРоссия');
});

test('copies an event to the same weekdays next year', async ({ page }) => {
  await openWithSeed(page);
  await clickDay(page, '2027-03-17');
  await dialog(page).getByRole('button', { name: ru.eventDialog.copyNextYear }).click();
  await expect(dialog(page).getByRole('heading')).toHaveText(ru.eventDialog.titleCopy);
  await expect(dialog(page).getByLabel(ru.eventDialog.start)).toHaveValue('2028-03-14');
  await expect(dialog(page).getByLabel(ru.eventDialog.end)).toHaveValue('2028-03-16');
  await save(page);

  await page.getByRole('button', { name: ru.toolbar.nextYear }).click();
  await expect(list(page).getByRole('row', { name: /ТрансРоссия/ })).toContainText(
    '14–16 марта 2028',
  );
  // The 2027 original is still there.
  await page.getByRole('button', { name: ru.toolbar.prevYear }).click();
  await expect(list(page).getByRole('row', { name: /ТрансРоссия/ })).toContainText(
    '16–18 марта 2027',
  );
});

test('undo and redo with the keyboard and the toolbar', async ({ page }) => {
  await openWithSeed(page);
  const undo = page.getByRole('button', { name: ru.editing.undo, exact: true });
  const redo = page.getByRole('button', { name: ru.editing.redo, exact: true });
  await expect(undo).toBeDisabled();
  await clickDay(page, '2027-03-17');
  await dialog(page).getByRole('button', { name: ru.common.delete }).click();
  await expect(list(page)).not.toContainText('ТрансРоссия');

  await page.keyboard.press('Control+z');
  await expect(list(page)).toContainText('ТрансРоссия');
  await page.keyboard.press('Control+y');
  await expect(list(page)).not.toContainText('ТрансРоссия');
  await undo.click();
  await expect(list(page)).toContainText('ТрансРоссия');
  await redo.click();
  await expect(list(page)).not.toContainText('ТрансРоссия');
  await page.keyboard.press('Control+Shift+z');
  await expect(redo).toBeDisabled();
});

test('"+ Выставка" asks for the exhibition before saving', async ({ page }) => {
  await openWithSeed(page);
  await page.getByRole('button', { name: ru.editing.newEvent }).click();
  await dialog(page).getByRole('button', { name: ru.common.save }).click();
  await expect(dialog(page).getByRole('alert')).toHaveText(ru.editErrors.exhibitionRequired);
  await pickExhibition(page, 'CeMAT', 'CeMAT Asia');
  await dialog(page).getByLabel(ru.eventDialog.start).fill('2027-12-01');
  await dialog(page).getByLabel(ru.eventDialog.end).fill('2027-11-29');
  await save(page);
  // End before start is swapped automatically.
  await expect(list(page).getByRole('row', { name: /29 ноября – 1 декабря 2027/ })).toContainText(
    'CeMAT Asia',
  );
});

test('warns about three events on one day and opens one on click', async ({ page }) => {
  await openWithSeed(page);
  for (let i = 0; i < 3; i++) {
    await dragDays(page, '2027-09-20', '2027-09-21');
    await pickExhibition(page, 'TransLogistica Caspian', 'TransLogistica Caspian');
    await save(page);
  }
  const warnings = page.getByTestId('warnings');
  const warning = warnings.getByRole('button', { name: /Три и более выставки в один день/ });
  await expect(warning).toBeVisible();
  await warning.click();
  await expect(dialog(page)).toBeVisible();
  await expect(dialog(page).getByLabel(ru.eventDialog.start)).toHaveValue('2027-09-20');
});

test('warns about a year without holidays and fills them from the panel', async ({ page }) => {
  await openWithSeed(page);
  await page.getByRole('spinbutton').fill('2031');
  const warning = page.getByRole('button', { name: ru.warnings.noHolidays(2031) });
  await warning.click();
  const holidays = page.getByTestId('holidays-dialog');
  await holidays.getByRole('button', { name: ru.holidays.fill }).click();
  await expect(holidays).toContainText(ru.holidays.filled(11));
  await holidays.getByRole('button', { name: ru.common.close }).click();
  await expect(page.getByTestId('warnings')).toBeHidden();
});
