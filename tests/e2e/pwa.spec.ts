// SPEC 2 #23, 5.9, 7.2: installable, offline after the first visit, update banner.
import { readFile, writeFile } from 'node:fs/promises';
import { expect, test, type Page } from '@playwright/test';
import { ru } from '../../src/i18n/ru.ts';
import { collectErrors, useMemoryStorage } from './helpers.ts';

test.use({ serviceWorkers: 'allow' });
// The update tests change the built sw.js; run this file's tests one after another.
test.describe.configure({ mode: 'serial' });

test.afterEach(async () => {
  if (originalSw !== null) await writeFile(SW_FILE, originalSw);
  originalSw = null;
});

/** Waits until the service worker has precached the build and controls the page. */
async function waitForServiceWorker(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (navigator.serviceWorker.controller === null) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          resolve();
        });
      });
    }
  });
}

async function createFolder(page: Page): Promise<void> {
  await page.getByRole('button', { name: ru.start.create }).click();
  await expect(page.getByTestId('calendar-preview')).toBeVisible();
}

test('is installable: manifest with name, start URL and icons', async ({ page, request }) => {
  await page.goto('./');
  const href = await page.locator('link[rel="manifest"]').getAttribute('href');
  expect(href).not.toBeNull();
  const manifestUrl = new URL(href ?? '', page.url()).toString();
  const manifest = (await (await request.get(manifestUrl)).json()) as {
    name: string;
    start_url: string;
    display: string;
    icons: { src: string; sizes: string; purpose?: string }[];
  };
  expect(manifest.name).toBe(ru.appName);
  expect(manifest.start_url).toBe('/kalendar-vystavok/');
  expect(manifest.display).toBe('standalone');
  expect(manifest.icons.map((i) => i.sizes)).toEqual(
    expect.arrayContaining(['192x192', '512x512']),
  );
  expect(manifest.icons.some((i) => i.purpose === 'maskable')).toBe(true);
  for (const icon of manifest.icons) {
    const res = await request.get(new URL(icon.src, manifestUrl).toString());
    expect(res.ok(), icon.src).toBe(true);
  }
  await waitForServiceWorker(page);
});

test('works offline after the first visit: start, create a folder, export a PDF', async ({
  page,
  context,
}) => {
  const errors = collectErrors(page);
  await useMemoryStorage(page);
  await page.goto('./');
  await waitForServiceWorker(page);

  await context.setOffline(true);
  await page.reload();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(ru.appName);
  // The seed chunk, fonts and jsPDF come from the cache.
  await createFolder(page);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: ru.pdf.download }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('Kalendar_2027_year.pdf');
  expect(errors).toEqual([]);
});

const SW_FILE = 'dist/sw.js';
const INDEX_ENTRY = '","url":"index.html"';
let originalSw: string | null = null;

/**
 * Simulates a deploy: Playwright cannot route the browser's service-worker update check, so
 * the built sw.js is changed on disk. One hex digit of index.html's precache revision is flipped,
 * keeping the file size the preview server has cached. Restored after each test.
 */
async function deployNewVersion(page: Page): Promise<void> {
  originalSw = await readFile(SW_FILE, 'utf8');
  const at = originalSw.indexOf(INDEX_ENTRY) - 1;
  if (at < 0) throw new Error(`No precache entry for index.html in ${SW_FILE}`);
  const digit = originalSw.charAt(at) === '0' ? '1' : '0';
  await writeFile(SW_FILE, originalSw.slice(0, at) + digit + originalSw.slice(at + 1));
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    await registration?.update();
  });
  await expect(page.getByTestId('update-banner')).toBeVisible();
  await expect(page.getByTestId('update-banner')).toContainText(ru.update.available);
}

/** A marker that survives only as long as the page is not reloaded. */
async function markPage(page: Page): Promise<void> {
  await page.evaluate(() => {
    (window as unknown as { __notReloaded: boolean }).__notReloaded = true;
  });
}

async function isSamePage(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as unknown as { __notReloaded?: boolean }).__notReloaded === true,
  );
}

test('the update button switches to the new version and reloads', async ({ page }) => {
  await useMemoryStorage(page);
  await page.goto('./');
  await waitForServiceWorker(page);
  await deployNewVersion(page);
  await markPage(page);

  const reloaded = page.waitForEvent('load');
  await page.getByRole('button', { name: ru.update.apply }).click();
  await reloaded;
  expect(await isSamePage(page)).toBe(false);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(ru.appName);
  await expect(page.getByTestId('update-banner')).toBeHidden();
});

test('never reloads on its own while a dialog is open', async ({ page }) => {
  await useMemoryStorage(page);
  await page.goto('./');
  await waitForServiceWorker(page);
  await createFolder(page);
  await deployNewVersion(page);
  await markPage(page);

  await page.getByRole('button', { name: ru.editing.holidays }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  // The new version takes over without the update button here, e.g. started from another window.
  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const changed = new Promise<void>((resolve) => {
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        resolve();
      });
    });
    registration?.waiting?.postMessage({ type: 'SKIP_WAITING' });
    await changed;
  });
  await page.waitForTimeout(1000);
  expect(await isSamePage(page)).toBe(true);
  await expect(page.getByRole('dialog')).toBeVisible();

  const reloaded = page.waitForEvent('load');
  await page.keyboard.press('Escape');
  await reloaded;
  expect(await isSamePage(page)).toBe(false);
});
