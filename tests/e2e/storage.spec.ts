// Storage flows (SPEC 4.2–4.6) on the real File System Access adapter. Playwright cannot drive the
// native folder picker, so `showDirectoryPicker` returns a directory of the origin private file
// system (OPFS), which supports the same handles, permissions and atomic `createWritable`.
import { expect, test, type Page } from '@playwright/test';
import { ru } from '../../src/i18n/ru.ts';
import { AUTOSAVE_DELAY_MS } from '../../src/state/autosave.ts';
import { collectErrors } from './helpers.ts';

const FOLDER = 'picked';

/** Picker stub; `prompt`: permission is not kept across reloads, as in a real browser restart. */
async function stubPicker(page: Page, { prompt = false } = {}) {
  await page.addInitScript(
    ({ folder, prompt }) => {
      const picker = async () =>
        (await navigator.storage.getDirectory()).getDirectoryHandle(folder, { create: true });
      Object.assign(window, { showDirectoryPicker: picker });
      if (prompt) {
        const proto = FileSystemHandle.prototype as unknown as Record<string, unknown>;
        proto.queryPermission = () => Promise.resolve('prompt');
        proto.requestPermission = () => Promise.resolve('granted');
      }
    },
    { folder: FOLDER, prompt },
  );
}

/** Files in the picked folder: path → text. */
async function readFolder(page: Page): Promise<Record<string, string>> {
  return page.evaluate(async (folder) => {
    const out: Record<string, string> = {};
    const walk = async (dir: FileSystemDirectoryHandle, prefix: string) => {
      const entries = (dir as unknown as { values(): AsyncIterable<FileSystemHandle> }).values();
      for await (const entry of entries) {
        if (entry instanceof FileSystemDirectoryHandle)
          await walk(entry, `${prefix}${entry.name}/`);
        else if (entry instanceof FileSystemFileHandle) {
          out[`${prefix}${entry.name}`] = await (await entry.getFile()).text();
        }
      }
    };
    await walk(await (await navigator.storage.getDirectory()).getDirectoryHandle(folder), '');
    return out;
  }, FOLDER);
}

async function writeDataFile(page: Page, text: string) {
  // lastModified has millisecond resolution: make sure the external write is distinguishable.
  await page.waitForTimeout(20);
  await page.evaluate(
    async ({ folder, text }) => {
      const dir = await (await navigator.storage.getDirectory()).getDirectoryHandle(folder);
      const writable = await (await dir.getFileHandle('kalendar-data.json')).createWritable();
      await writable.write(text);
      await writable.close();
    },
    { folder: FOLDER, text },
  );
}

async function createFolder(page: Page) {
  await page.goto('./');
  await page.getByRole('button', { name: ru.start.create }).click();
  await expect(page.getByTestId('calendar-preview')).toBeVisible();
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');
}

function dataFile(files: Record<string, string>): { settings: { lastYear: number } } {
  return JSON.parse(files['kalendar-data.json'] ?? '') as { settings: { lastYear: number } };
}

function backupYear(files: Record<string, string>, path: string): number {
  return (JSON.parse(files[path] ?? '') as { settings: { lastYear: number } }).settings.lastYear;
}

test.describe('with a paused clock', () => {
  // Backup names use the browser's local time; UTC keeps the expected names fixed.
  test.use({ timezoneId: 'UTC' });

  test('creates a data folder, autosaves, and continues with one click after a restart', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    // The clock stays paused at 10:00:00.000 except when a test step advances it, so every
    // backup name is known in advance. Same-millisecond backups are what broke CI before.
    await page.clock.install({ time: new Date('2027-03-14T09:00:00Z') });
    await page.clock.pauseAt(new Date('2027-03-14T10:00:00Z'));
    await stubPicker(page, { prompt: true });
    await createFolder(page);
    expect(Object.keys(await readFolder(page))).toEqual(['kalendar-data.json']);

    await page.getByRole('button', { name: ru.toolbar.nextYear }).click();
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saving');
    await page.clock.runFor(AUTOSAVE_DELAY_MS); // the debounce fires at 10:00:00.800
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');
    expect(dataFile(await readFolder(page)).settings.lastYear).toBe(2028);

    await page.reload();
    await page.getByRole('button', { name: ru.start.resume }).click();
    await expect(page.getByRole('spinbutton')).toHaveValue('2028');
    await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');

    // SPEC 4.3: the first edit copied the seed before overwriting it; the restart copied the
    // edited file right after loading it. Neither copy replaces the other.
    const files = await readFolder(page);
    const backups = Object.keys(files)
      .filter((f) => f.startsWith('backups/'))
      .sort();
    expect(backups).toHaveLength(2);
    const [preOverwrite = '', startUp = ''] = backups;
    expect(preOverwrite).toBe('backups/kalendar-data_2027-03-14_10-00-00-800.json');
    expect(startUp).toBe('backups/kalendar-data_2027-03-14_10-00-00-800_2.json');
    expect(backupYear(files, preOverwrite)).toBe(2027);
    expect(backupYear(files, startUp)).toBe(2028);
    expect(errors).toEqual([]);
  });
});

test('opens the remembered folder directly while permission is granted', async ({ page }) => {
  await stubPicker(page);
  await createFolder(page);
  await page.reload();
  await expect(page.getByTestId('calendar-preview')).toBeVisible();
});

test('does not overwrite a folder that already has data', async ({ page }) => {
  await stubPicker(page);
  await createFolder(page);
  await page.getByRole('button', { name: ru.toolbar.nextYear }).click();
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');
  // Start over in the same folder, as if the remembered folder were forgotten.
  await page.evaluate(() => indexedDB.deleteDatabase('kalendar-vystavok'));
  await page.reload();
  await page.getByRole('button', { name: ru.start.create }).click();
  await expect(page.getByText(ru.start.folderHasData)).toBeVisible();
  await page.getByRole('button', { name: ru.start.openThem }).click();
  await expect(page.getByRole('spinbutton')).toHaveValue('2028');
});

test('shows an invalid file and restores the newest valid backup', async ({ page }) => {
  await stubPicker(page);
  await createFolder(page);
  await page.reload(); // writes the start backup
  await expect(page.getByTestId('calendar-preview')).toBeVisible();
  await writeDataFile(page, '{ not json');

  await page.reload();
  await expect(page.getByTestId('invalid-screen')).toBeVisible();
  expect((await readFolder(page))['kalendar-data.json']).toBe('{ not json');
  await page.getByRole('button', { name: /Открыть резервную копию/ }).click();
  await expect(page.getByTestId('calendar-preview')).toBeVisible();
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');

  const files = await readFolder(page);
  expect(dataFile(files).settings.lastYear).toBe(2027);
  const invalidCopy = Object.entries(files).find(([name]) => name.includes('_invalid_'));
  expect(invalidCopy?.[1]).toBe('{ not json');
});

test('stops autosave on an external change and reloads from disk', async ({ page }) => {
  await stubPicker(page);
  await createFolder(page);
  const disk = JSON.parse((await readFolder(page))['kalendar-data.json'] ?? '') as {
    settings: { lastYear: number };
  };
  disk.settings.lastYear = 2033;
  await writeDataFile(page, JSON.stringify(disk));

  await page.getByRole('button', { name: ru.toolbar.nextYear }).click();
  await expect(page.getByTestId('conflict-dialog')).toBeVisible();
  expect(dataFile(await readFolder(page)).settings.lastYear).toBe(2033);
  await page.getByRole('button', { name: ru.conflict.reload }).click();
  await expect(page.getByRole('spinbutton')).toHaveValue('2033');
});

test('overwrites an external change on request', async ({ page }) => {
  await stubPicker(page);
  await createFolder(page);
  await writeDataFile(page, (await readFolder(page))['kalendar-data.json'] ?? '');
  await page.getByRole('button', { name: ru.toolbar.nextYear }).click();
  await page.getByRole('button', { name: ru.conflict.overwrite }).click();
  await expect(page.getByTestId('conflict-dialog')).toBeHidden();
  await expect(page.getByTestId('save-status')).toHaveAttribute('data-status', 'saved');
  expect(dataFile(await readFolder(page)).settings.lastYear).toBe(2028);
});

test('a second tab is read-only', async ({ page, context }) => {
  await stubPicker(page);
  await createFolder(page);
  const second = await context.newPage();
  await second.goto('./');
  await expect(second.getByTestId('read-only-banner')).toHaveText(ru.readOnly.otherTab);
  await expect(second.getByTestId('calendar-preview')).toBeVisible();
  await expect(second.getByTestId('save-status')).toHaveCount(0);
  await expect(page.getByTestId('read-only-banner')).toHaveCount(0);
});

test('shows the unsupported screen without File System Access', async ({ page }) => {
  await page.addInitScript(() => {
    delete (window as unknown as Record<string, unknown>).showDirectoryPicker;
    delete (Window.prototype as unknown as Record<string, unknown>).showDirectoryPicker;
  });
  await page.goto('./');
  await expect(page.getByTestId('unsupported-screen')).toContainText(ru.unsupported.text);
});

test('loads the seed data only when a new folder is created', async ({ page }) => {
  await stubPicker(page);
  const scripts: string[] = [];
  page.on('request', (r) => {
    if (r.resourceType() === 'script') scripts.push(r.url());
  });
  await page.goto('./');
  await expect(page.getByRole('button', { name: ru.start.create })).toBeVisible();
  expect(scripts.some((u) => /\/seed-[^/]*\.js$/.test(u))).toBe(false);
  await page.getByRole('button', { name: ru.start.create }).click();
  await expect(page.getByTestId('calendar-preview')).toBeVisible();
  expect(scripts.some((u) => /\/seed-[^/]*\.js$/.test(u))).toBe(true);
});
