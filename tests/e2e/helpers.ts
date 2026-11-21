import { expect, type Page } from '@playwright/test';
import { ru } from '../../src/i18n/ru.ts';

export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push(msg.text());
  });
  return errors;
}

/** Injects memoryStorage through the test flag (SPEC 7.2). */
export async function useMemoryStorage(page: Page): Promise<void> {
  await page.addInitScript(() => {
    (window as unknown as { __KALENDAR_TEST__: unknown }).__KALENDAR_TEST__ = { storage: 'memory' };
  });
}

/** Memory storage + "Создать новую папку данных": the app shows the seed data. */
export async function openWithSeed(page: Page): Promise<void> {
  await useMemoryStorage(page);
  await page.goto('./');
  await page.getByRole('button', { name: ru.start.create }).click();
  await expect(page.getByTestId('calendar-preview')).toBeVisible();
}
