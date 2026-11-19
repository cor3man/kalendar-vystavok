import { expect, test } from '@playwright/test';
import pkg from '../../package.json' with { type: 'json' };
import { ru } from '../../src/i18n/ru.ts';

test('shows the app name and version', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('./');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(ru.appName);
  await expect(page.getByTestId('app-version')).toHaveText(`v${pkg.version}`);
  await expect(page).toHaveTitle(ru.appName);
  expect(errors).toEqual([]);
});
