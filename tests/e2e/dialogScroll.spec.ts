// Bug: closing any modal scrolled the page. Opening and closing a dialog must leave the scroll
// position as it was, while focus still returns to the opener (SPEC 5.9).
import { expect, test, type Locator, type Page } from '@playwright/test';
import { ru } from '../../src/i18n/ru.ts';
import { dayPoint, openWithSeed, setSelectionMode } from './helpers.ts';

// Short enough that the page scrolls.
test.use({ viewport: { width: 1280, height: 720 } });

const scrollY = (page: Page) => page.evaluate(() => window.scrollY);

async function scrollTo(page: Page, y: number) {
  await page.evaluate((top) => {
    window.scrollTo(0, top);
  }, y);
  await expect.poll(() => scrollY(page)).toBe(y);
}

/** Opens a dialog, closes it, and checks the scroll position did not move. */
async function expectNoScroll(
  page: Page,
  open: () => Promise<void>,
  dialog: Locator,
  close: () => Promise<void>,
) {
  const before = await scrollY(page);
  await open();
  await expect(dialog).toBeVisible();
  await close();
  await expect(dialog).toBeHidden();
  // Give a late scroll (focus restoration, scroll-into-view) the chance to happen.
  await page.waitForTimeout(200);
  expect(await scrollY(page)).toBe(before);
}

const esc = (page: Page) => () => page.keyboard.press('Escape');

const toolbarDialogs = [
  { button: ru.editing.newEvent, testId: 'event-dialog', closeLabel: ru.common.cancel },
  { button: ru.editing.catalogue, testId: 'catalogue-dialog', closeLabel: ru.common.close },
  { button: ru.editing.holidays, testId: 'holidays-dialog', closeLabel: ru.common.close },
  { button: ru.data.open, testId: 'data-dialog', closeLabel: ru.common.close },
] as const;

for (const { button, testId, closeLabel } of toolbarDialogs) {
  test(`closing the "${button}" dialog keeps the scroll position`, async ({ page }) => {
    await openWithSeed(page);
    await scrollTo(page, 0);
    const opener = page.getByRole('button', { name: button, exact: true });
    const dialog = page.getByTestId(testId);
    const open = () => opener.click();

    await expectNoScroll(page, open, dialog, esc(page));
    await expect(opener).toBeFocused();
    await expectNoScroll(page, open, dialog, () =>
      dialog.getByRole('button', { name: closeLabel, exact: true }).last().click(),
    );
    await expect(opener).toBeFocused();
  });
}

test('closing an event opened from the calendar keeps the scroll position', async ({ page }) => {
  await openWithSeed(page);
  // A single click on an empty day opens the dialog only in drag mode (SPEC 5.3).
  await setSelectionMode(page, 'drag');
  await scrollTo(page, 0);
  const dialog = page.getByTestId('event-dialog');
  // ТрансРоссия and an empty day, both visible without scrolling.
  for (const day of ['2027-03-17', '2027-09-07']) {
    const p = await dayPoint(page, day);
    await expectNoScroll(page, () => page.mouse.click(p.x, p.y), dialog, esc(page));
  }
  // Also with the page scrolled a little.
  await scrollTo(page, 150);
  const p = await dayPoint(page, '2027-03-17');
  await expectNoScroll(
    page,
    () => page.mouse.click(p.x, p.y),
    dialog,
    () => dialog.getByRole('button', { name: ru.common.cancel }).click(),
  );
});

test('closing an event opened from the event list keeps the scroll position', async ({ page }) => {
  await openWithSeed(page);
  const row = page.getByTestId('event-list').getByRole('button', { name: 'ТрансРоссия' });
  await row.scrollIntoViewIfNeeded();
  const dialog = page.getByTestId('event-dialog');
  await expectNoScroll(page, () => row.click(), dialog, esc(page));
  await expect(row).toBeFocused();
  await expectNoScroll(
    page,
    () => row.click(),
    dialog,
    () => dialog.getByRole('button', { name: ru.common.save }).click(),
  );
});

test('a calendar click after using the event list keeps the scroll position', async ({ page }) => {
  await openWithSeed(page);
  // A single click on an empty day opens the dialog only in drag mode (SPEC 5.3).
  await setSelectionMode(page, 'drag');
  // Focus ends up on a button low on the page (the event list) ...
  const row = page.getByTestId('event-list').getByRole('button', { name: 'ТрансРоссия' });
  await row.scrollIntoViewIfNeeded();
  await row.click();
  await page.keyboard.press('Escape');
  await expect(row).toBeFocused();
  // ... then the user scrolls up and works on the calendar.
  await scrollTo(page, 0);
  const dialog = page.getByTestId('event-dialog');
  for (const day of ['2027-03-17', '2027-09-07']) {
    const p = await dayPoint(page, day);
    await expectNoScroll(page, () => page.mouse.click(p.x, p.y), dialog, esc(page));
    // The calendar click, not the old list button, opened the dialog: focus must not go back there.
    await expect(row).not.toBeFocused();
  }
});
