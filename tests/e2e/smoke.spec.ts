import { expect, test, type Page } from '@playwright/test';
import pkg from '../../package.json' with { type: 'json' };
import { ru } from '../../src/i18n/ru.ts';
import seed from '../../src/storage/seed.json' with { type: 'json' };

function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

test('shows the app name and version', async ({ page }) => {
  const errors = collectErrors(page);
  await page.goto('./');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(ru.appName);
  await expect(page.getByTestId('app-version')).toHaveText(`v${pkg.version}`);
  await expect(page).toHaveTitle(ru.appName);
  expect(errors).toEqual([]);
});

const firstHalf = seed.exhibitions.filter((e) => e.start < '2027-07-01').map((e) => e.city);
const secondHalf = seed.exhibitions.filter((e) => e.start >= '2027-07-01').map((e) => e.city);

const cases = [
  { format: 'year', title: '2027', cities: [...firstHalf, ...secondHalf] },
  { format: 'h1', title: '2027', cities: firstHalf },
  { format: 'h2', title: '2027', cities: secondHalf },
  { format: 'split', title: '2027–2028', cities: secondHalf },
] as const;

for (const { format, title, cities } of cases) {
  test(`renders the seed preview in the ${format} format`, async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto('./');
    await page.getByLabel(ru.toolbar.format).selectOption(format);

    const preview = page.getByTestId('calendar-preview');
    await expect(preview).toHaveAttribute('data-format', format);
    const svg = preview.locator('svg');
    await expect(svg.locator('text', { hasText: new RegExp(`^${title}$`) }).first()).toBeVisible();
    for (const city of cities) {
      await expect(
        svg.locator('text', { hasText: new RegExp(`^${city}$`) }).first(),
      ).toBeAttached();
    }
    expect(errors).toEqual([]);
  });
}

test('changes the year with the arrow buttons', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: ru.toolbar.nextYear }).click();
  await expect(page.getByRole('spinbutton')).toHaveValue('2028');
  await expect(
    page
      .getByTestId('calendar-preview')
      .locator('svg text', { hasText: /^2028$/ })
      .first(),
  ).toBeVisible();
});
