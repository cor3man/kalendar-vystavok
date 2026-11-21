import { expect, type Page } from '@playwright/test';
import type { FormatId } from '../../src/domain/types.ts';
import { ru } from '../../src/i18n/ru.ts';
import { pageGeometry } from '../../src/layout/pageSpec.ts';

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

/** Page point (viewport px) at the middle of a day cell's event area on the preview. */
export async function dayPoint(
  page: Page,
  iso: string,
  format: FormatId = 'year',
): Promise<{ x: number; y: number }> {
  const year = Number(iso.slice(0, 4));
  const month = Number(iso.slice(5, 7));
  const day = Number(iso.slice(8, 10));
  const layer = page.getByTestId('selection-layer');
  const box = await layer.boundingBox();
  if (box === null) throw new Error('Preview is not visible');
  // The page's first year: for `split` January belongs to the next year.
  const pageYear = format === 'split' && month <= 6 ? year - 1 : year;
  const g = pageGeometry(format, pageYear);
  const column = g.months.findIndex((m) => m.year === year && m.month === month);
  if (column === -1) throw new Error(`${iso} is not on the ${format} page`);
  const scale = box.width / g.spec.w;
  return {
    x: box.x + (g.grid.x + (column + 0.6) * g.colW) * scale,
    y: box.y + (g.grid.y + (day - 0.5) * g.rowH) * scale,
  };
}

/** Scrolls the preview to the top of the viewport, so the whole grid can be reached. */
export async function showPreview(page: Page): Promise<void> {
  await page.getByTestId('calendar-preview').evaluate((el) => {
    el.scrollIntoView({ block: 'start' });
  });
}

/** Press on one day, move to another, release (SPEC 5.3). */
export async function dragDays(
  page: Page,
  from: string,
  to: string,
  format: FormatId = 'year',
): Promise<void> {
  await showPreview(page);
  const a = await dayPoint(page, from, format);
  const b = await dayPoint(page, to, format);
  await page.mouse.move(a.x, a.y);
  await page.mouse.down();
  await page.mouse.move(b.x, b.y, { steps: 8 });
  await page.mouse.up();
}

export async function clickDay(page: Page, iso: string, format: FormatId = 'year'): Promise<void> {
  await showPreview(page);
  const p = await dayPoint(page, iso, format);
  await page.mouse.click(p.x, p.y);
}
