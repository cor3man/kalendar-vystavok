// SPEC 7.1, 5.9: keyboard-only use. Every step below uses the keyboard; focus is visible, trapped
// in dialogs and returned to the opener.
import { expect, test, type Locator, type Page } from '@playwright/test';
import { ru } from '../../src/i18n/ru.ts';
import { useMemoryStorage } from './helpers.ts';

/** Presses Tab until `target` has the focus; fails if it is not reachable. */
async function tabTo(page: Page, target: Locator, maxSteps = 200): Promise<void> {
  for (let i = 0; i < maxSteps; i++) {
    if (await target.evaluate((el) => el === document.activeElement)) return;
    await page.keyboard.press('Tab');
  }
  throw new Error(`Not reachable with Tab in ${String(maxSteps)} steps: ${target.toString()}`);
}

async function expectFocusVisible(target: Locator): Promise<void> {
  await expect(target).toBeFocused();
  const outline = await target.evaluate((el) => {
    const s = getComputedStyle(el);
    return { style: s.outlineStyle, width: parseFloat(s.outlineWidth) };
  });
  expect(outline.style).not.toBe('none');
  expect(outline.width).toBeGreaterThan(0);
}

test('create, open, delete and undo an exhibition without the mouse', async ({ page }) => {
  await useMemoryStorage(page);
  await page.goto('./');

  const create = page.getByRole('button', { name: ru.start.create });
  await tabTo(page, create);
  await expectFocusVisible(create);
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('calendar-preview')).toBeVisible();

  // "+ Выставка": a new event on the first day of the page (1 January 2027).
  const newEvent = page.getByRole('button', { name: ru.editing.newEvent });
  await tabTo(page, newEvent);
  await expectFocusVisible(newEvent);
  await page.keyboard.press('Enter');
  const dialog = page.getByTestId('event-dialog');
  await expect(dialog).toBeVisible();
  const combobox = dialog.getByRole('combobox', { name: ru.eventDialog.exhibition });
  await expect(combobox).toBeFocused();

  // Focus never reaches the page behind the modal. (Chrome lets Tab pass from the last control
  // to its own toolbar and back, which leaves `document.body` as the active element meanwhile.)
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const inside = await dialog.evaluate(
      (d) => document.activeElement === document.body || d.contains(document.activeElement),
    );
    expect(inside).toBe(true);
  }
  await combobox.focus();

  await page.keyboard.type('CeMAT');
  await page.keyboard.press('Enter'); // picks "CeMAT Asia"
  await expect(combobox).toHaveValue('CeMAT Asia');
  await page.keyboard.press('Enter'); // "Сохранить"
  await expect(dialog).toBeHidden();
  await expect(newEvent).toBeFocused();

  const list = page.getByTestId('event-list');
  const row = list.getByRole('row', { name: /1 января 2027/ });
  await expect(row).toContainText('CeMAT Asia');

  // Open it from the event list and delete it.
  const open = row.getByRole('button');
  await tabTo(page, open);
  await page.keyboard.press('Enter');
  await expect(dialog).toBeVisible();
  await tabTo(page, dialog.getByRole('button', { name: ru.common.delete }));
  await page.keyboard.press('Enter');
  await expect(dialog).toBeHidden();
  await expect(row).toHaveCount(0);

  // «Удалено. Отменить» is reachable with Tab.
  const undo = page
    .getByTestId('delete-toast')
    .getByRole('button', { name: ru.eventDialog.undoDelete });
  await tabTo(page, undo);
  await expectFocusVisible(undo);
  await page.keyboard.press('Enter');
  await expect(row).toContainText('CeMAT Asia');
});

test('every dialog opens and closes from the keyboard and returns focus', async ({ page }) => {
  await useMemoryStorage(page);
  await page.goto('./');
  await tabTo(page, page.getByRole('button', { name: ru.start.create }));
  await page.keyboard.press('Enter');
  await expect(page.getByTestId('calendar-preview')).toBeVisible();

  const dialogs = [
    { button: ru.editing.catalogue, testId: 'catalogue-dialog' },
    { button: ru.editing.holidays, testId: 'holidays-dialog' },
    { button: ru.settings.open, testId: 'settings-dialog' },
    { button: ru.data.open, testId: 'data-dialog' },
  ];
  for (const { button, testId } of dialogs) {
    const opener = page.getByRole('button', { name: button, exact: true });
    await tabTo(page, opener);
    await page.keyboard.press('Enter');
    const dialog = page.getByTestId(testId);
    await expect(dialog).toBeVisible();
    expect(await dialog.evaluate((d) => d.contains(document.activeElement))).toBe(true);
    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
    await expect(opener).toBeFocused();
  }
});
