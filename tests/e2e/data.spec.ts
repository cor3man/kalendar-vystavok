// Data screen (SPEC 5.1, 4.7): export, import, backups, change folder. Runs on memoryStorage.
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import pkg from '../../package.json' with { type: 'json' };
import { ru } from '../../src/i18n/ru.ts';
import { parseDataFile } from '../../src/storage/schema.ts';
import { collectErrors, openWithSeed } from './helpers.ts';

const fixturePath = fileURLToPath(new URL('../fixtures/v1-minimal.json', import.meta.url));

async function openData(page: Page) {
  await page.getByRole('button', { name: ru.data.open }).click();
  const dialog = page.getByTestId('data-dialog');
  await expect(dialog).toBeVisible();
  return dialog;
}

async function waitSaved(page: Page) {
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');
}

test('shows the folder and the app version', async ({ page }) => {
  const errors = collectErrors(page);
  await openWithSeed(page);
  const dialog = await openData(page);
  await expect(dialog.getByTestId('data-folder')).toHaveText('Memory');
  await expect(dialog).toContainText(`v${pkg.version}`);
  await expect(dialog).toContainText(ru.data.noBackups);
  await page.keyboard.press('Escape');
  await expect(dialog).toBeHidden();
  expect(errors).toEqual([]);
});

test('exports the data as a valid JSON file', async ({ page }) => {
  await openWithSeed(page);
  const dialog = await openData(page);
  const downloading = page.waitForEvent('download');
  await dialog.getByRole('button', { name: ru.data.export }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toMatch(/^kalendar-data_\d{4}-\d{2}-\d{2}\.json$/);
  const text = await readFile(await download.path(), 'utf8');
  const parsed = parseDataFile(text);
  expect(parsed.kind).toBe('ok');
  expect(parsed.kind === 'ok' && parsed.data.events).toHaveLength(9);
});

test('imports a file after showing the counts', async ({ page }) => {
  await openWithSeed(page);
  const dialog = await openData(page);
  await dialog.getByTestId('import-file').setInputFiles(fixturePath);
  const confirm = page.getByTestId('import-dialog');
  await expect(confirm).toContainText(`${ru.data.counts.events}: 1`);
  await expect(confirm).toContainText(`${ru.data.counts.countries}: 2`);
  await confirm.getByRole('button', { name: ru.data.importDo }).click();
  await expect(dialog).toBeHidden();

  // The fixture's settings: 2027, first half-year.
  await expect(page.getByTestId('calendar-preview')).toHaveAttribute('data-format', 'h1');
  await expect(page.locator('svg text', { hasText: /^Expo$/ }).first()).toBeAttached();
  await waitSaved(page);

  // The data before the import went to backups first.
  const again = await openData(page);
  await expect(again.getByTestId('backup-list').locator('li')).toHaveCount(1);
});

test('rejects a file that is not a data file', async ({ page }) => {
  await openWithSeed(page);
  const dialog = await openData(page);
  await dialog.getByTestId('import-file').setInputFiles({
    name: 'notes.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"hello": 1}'),
  });
  await expect(dialog.getByRole('alert')).toHaveText(ru.data.importInvalid);
  await expect(page.getByTestId('import-dialog')).toHaveCount(0);
});

test('restores a backup after confirmation', async ({ page }) => {
  await openWithSeed(page);
  // The first save after creating the folder backs up the seed.
  await page.getByRole('button', { name: ru.toolbar.nextYear }).click();
  await waitSaved(page);
  await expect(page.getByRole('spinbutton')).toHaveValue('2028');

  const dialog = await openData(page);
  await dialog.getByRole('button', { name: ru.data.restore }).click();
  await page
    .getByRole('dialog', { name: ru.common.confirm })
    .getByRole('button', { name: ru.data.restore })
    .click();
  await expect(dialog).toBeHidden();
  await expect(page.getByRole('spinbutton')).toHaveValue('2027');
  await waitSaved(page);
});

test('changes the folder', async ({ page }) => {
  await openWithSeed(page);
  const dialog = await openData(page);
  await dialog.getByRole('button', { name: ru.data.changeFolder }).click();
  await expect(page.getByTestId('start-screen')).toBeVisible();
  await expect(page.getByRole('button', { name: ru.start.create })).toBeVisible();
});
