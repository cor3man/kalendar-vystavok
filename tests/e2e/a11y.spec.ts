// SPEC 7.1, 5.9: WCAG 2.x A/AA audit (axe) of every screen and dialog.
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ru } from '../../src/i18n/ru.ts';
import { clickDay, openWithSeed, useMemoryStorage } from './helpers.ts';

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function expectNoViolations(page: Page): Promise<void> {
  const { violations } = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = violations.map(
    (v) =>
      `${v.id} (${v.impact ?? '?'}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`,
  );
  expect(summary).toEqual([]);
}

test('start screen', async ({ page }) => {
  await useMemoryStorage(page);
  await page.goto('./');
  await expect(page.getByRole('button', { name: ru.start.create })).toBeVisible();
  await expectNoViolations(page);
});

test('unsupported screen', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).showDirectoryPicker;
    delete (Window.prototype as unknown as Record<string, unknown>).showDirectoryPicker;
  });
  await page.goto('./');
  await expect(page.getByTestId('unsupported-screen')).toBeVisible();
  await expectNoViolations(page);
});

test('main screen with the calendar and the event list', async ({ page }) => {
  await openWithSeed(page);
  await expectNoViolations(page);
});

test('main screen with the warnings panel', async ({ page }) => {
  await openWithSeed(page);
  // The seed has holidays for 2026–2028 only; 2030 shows «Нет праздников на год».
  await page.getByRole('spinbutton').fill('2030');
  await expect(page.getByTestId('warnings')).toBeVisible();
  await expectNoViolations(page);
});

test('event dialog (new and edit) and the delete toast', async ({ page }) => {
  await openWithSeed(page);
  await page.getByRole('button', { name: ru.editing.newEvent }).click();
  await expect(page.getByTestId('event-dialog')).toBeVisible();
  await expectNoViolations(page);
  await page.keyboard.press('Escape');

  await clickDay(page, '2027-03-17');
  await expect(page.getByTestId('event-dialog')).toBeVisible();
  await expectNoViolations(page);
  await page.getByTestId('event-dialog').getByRole('button', { name: ru.common.delete }).click();
  await expect(page.getByTestId('delete-toast')).toBeVisible();
  await expectNoViolations(page);
});

test('catalogue: both tabs and the exhibition form', async ({ page }) => {
  await openWithSeed(page);
  await page.getByRole('button', { name: ru.editing.catalogue }).click();
  const dialog = page.getByTestId('catalogue-dialog');
  await expect(dialog).toBeVisible();
  await expectNoViolations(page);
  await dialog.getByRole('button', { name: ru.catalogue.addExhibition }).click();
  await expect(page.getByRole('heading', { name: ru.catalogue.newExhibition })).toBeVisible();
  await expectNoViolations(page);
  await page.keyboard.press('Escape');
  await dialog.getByRole('tab', { name: ru.catalogue.countriesTab }).click();
  await expectNoViolations(page);
});

test('holidays and data dialogs', async ({ page }) => {
  await openWithSeed(page);
  await page.getByRole('button', { name: ru.editing.holidays }).click();
  await expect(page.getByTestId('holidays-dialog')).toBeVisible();
  await expectNoViolations(page);
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: ru.data.open }).click();
  await expect(page.getByTestId('data-dialog')).toBeVisible();
  await expectNoViolations(page);
});
