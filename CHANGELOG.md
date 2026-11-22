# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

## [1.0.0] — 2026-11-22 — M5 Release 1.0

### Added

- Installable app (SPEC 5.9, decision 23): web app manifest («Календарь выставок», Russian,
  standalone) and icons generated from `public/icon.svg` (`npm run icons`). Chrome and Edge
  offer "Установить".
- Offline: a service worker (`src/sw.ts`) precaches the whole build, fonts and the seed and
  jsPDF chunks included, so after the first visit the app starts, creates a data folder and
  exports PDFs with no network.
- Update banner "Доступна новая версия — Обновить": saves pending changes, then switches to the
  new version. The page never reloads on its own while a dialog is open; it waits until the last
  dialog is closed. An open app checks for a new version every hour.
- `docs/USER_GUIDE.ru.md`: install, first run, add / edit / print, backups, updates, problems.
- E2E: installable manifest, offline reload with folder creation and PDF export, update and "no
  reload under a dialog" (`pwa.spec.ts`); axe WCAG A/AA audit of every screen and dialog
  (`a11y.spec.ts`); keyboard-only create / open / delete / undo and focus return
  (`keyboard.spec.ts`); performance budgets with 10 years of data (`performance.spec.ts`).
- Unit tests: update store, PDF image sizes, layout time with 10 years of data.
- Dev: a Claude Code PreToolUse hook (`.claude/hooks/blockPipedChecks.ts`) refuses Bash and
  PowerShell commands that pipe a check into `tail`, `head` or `Select-Object`.
- Dependencies: `workbox-window` (runtime, used by the service-worker registration);
  `vite-plugin-pwa`, `@vite-pwa/assets-generator`, `workbox-core`, `workbox-precaching`,
  `workbox-routing`, `@axe-core/playwright` (dev).

### Changed

- PDF images are embedded at their largest printed size at 600 dpi (office printer
  resolution): SVG flags were rasterised at 4× their pixel size (about 4 800 dpi); logos are
  only made smaller, never enlarged. A year with 200 events, 30 flags and about 200 logos now
  exports in 1.8–2.6 s instead of 3.6–3.8 s. The rule is now in SPEC 3.7.
- Performance tests enforce the SPEC 7.1 budgets locally and allow twice the budget on CI
  (`process.env.CI`); measured times and budgets are always logged.
- `src/sw.ts` documents why the injectManifest worker is kept: it holds only the standard
  Workbox precaching that generateSW would emit, plus `clientsClaim()` on first install.

### Security

- `npm audit --omit=dev`: 0 vulnerabilities in production dependencies. 4 moderate advisories
  remain in dev-only build tooling (`glob` / `minimatch` via `workbox-build` via
  `vite-plugin-pwa`); the only offered fix is a breaking downgrade of `vite-plugin-pwa`.

### Fixed

- Esc in the exhibition or country form closed the catalogue under it too; it now closes only
  the topmost dialog.

### Performance (SPEC 7.1)

Measured on the development PC with 10 years of data (2 000 events, 300 exhibitions with
logos), year view: app start 0.4–0.6 s (budget 2 s), preview of a year with 200 events
86–121 ms (budget 200 ms), first PDF export 1.8–2.6 s (budget 3 s). Layout alone: under
200 ms in every format (unit test).

### Demo

Open <https://cor3man.github.io/kalendar-vystavok/> in Chrome and press "Установить" in the
address bar: the app opens in its own window. Close it, turn off the network, start it from
the desktop icon: it works, and "Скачать PDF" still downloads the calendar. After the next
deploy the banner "Доступна новая версия" appears; "Обновить" switches to it.

## [0.5.0] — 2026-11-21 — M4 Editing

### Added

- Day selection on the calendar (SPEC 5.3): press on a day, drag, release to add an exhibition
  for those dates, also across months; selected days are highlighted with a tooltip ("31 марта –
  2 апреля 2027"); Esc cancels. A click on an exhibition opens it, a click on an empty day starts
  a one-day exhibition. Works with mouse, pen and touch, and after scrolling or resizing.
- Event dialog (5.4): exhibition combobox with search and "Создать выставку «…»", dates (swapped
  when reversed), city with suggestions, country with flags, 10 colours plus a custom colour with
  a warning for dark colours, "Выставка проведена", note. "Удалить" with a toast "Удалено.
  Отменить" (8 s) and "Копировать на следующий год" (+364 days, not held, editable).
- Catalogue (5.5): exhibitions and countries in tabs; add, edit, delete; logo and flag upload
  (PNG, JPG, SVG; resized to 600 × 300 / 160 × 120, max 200 KB); live preview of the short name in
  a 3-day cell; an exhibition or country in use cannot be deleted and the app lists the events.
- Holidays (5.8): table of the visible years; add, change the label, delete; "Заполнить
  праздниками Беларуси" without duplicating dates.
- Undo / redo of the last 20 changes (5.6): toolbar buttons, Ctrl+Z, Ctrl+Y, Ctrl+Shift+Z.
  Import and backup restore can be undone too.
- Warnings panel (5.7) and the event list of the visible period (5.2) under the calendar; a
  click opens the event (or the holidays for "Нет праздников на год").
- Toolbar: "+ Выставка", undo / redo, "Каталог", "Праздники".
- Unit tests for the edit rules, undo history, date ranges in words, colour lightness, hit-test,
  selection geometry and the short-name preview; e2e tests for every editing flow of SPEC 7.2.

### Changed

- SPEC 5.1, 5.4, 5.6, 7.2, §8 M4 and Appendix C updated with the approved M4 decisions: catalogue
  and holidays are modal dialogs; a copy is not held; the dark-colour warning uses CIE lightness
  L* < 45; the offline e2e test comes with the PWA in M5.
- A read-only window (other tab, newer file) disables all editing.

### Fixed

- Closing a dialog no longer scrolls the page. Focus still returns to the button that opened it,
  but without scrolling; a click on the calendar no longer leaves the focus on an event-list
  button further down, which closing the dialog used to scroll to.

### Demo

Open the app with a data folder. Drag over 10–12 August: the dialog opens with these dates; type
"Trans", pick "Transport logistic", save: it appears in the calendar and the list. Click
"ТрансРоссия", tick "Выставка проведена": a check mark appears. Delete it and press "Отменить" in
the toast. "Каталог" adds a country with a flag and an exhibition with a logo; "Праздники" fills
the Belarus holidays of a new year.

## [0.4.0] — 2026-11-21 — M3 Storage

### Added

- Data folder (SPEC 4.2): start screen with "Создать новую папку данных" / "Открыть
  существующую", one-click "Продолжить работу" for the remembered folder (handle in IndexedDB),
  "Выбрать другую папку". Creating never overwrites a folder that already has data. Browsers
  without File System Access get the "unsupported" screen.
- Autosave (4.3), debounced 800 ms, with a status in the toolbar. Writes are atomic
  (`createWritable`). Backups: one on every app start, at most one per 10 minutes while
  editing, newest 30 kept; names carry milliseconds and a counter suffix (`_2`) if taken, so
  an existing backup is never overwritten. External changes are detected by `lastModified`; autosave stops and
  asks to reload from disk or overwrite. A failed save keeps the data in memory, shows a banner
  with "Скачать резервную копию" and retries on the next change. The app saves when the tab is
  hidden and warns before closing with unsaved changes.
- zod schema of the data file and a migrations framework (4.4, 4.5). An invalid file is never
  overwritten: the app offers the newest valid backup and keeps the broken file as a
  `kalendar-data_invalid_…` copy. A file from a newer app version opens read-only.
- One tab at a time (4.6): a second tab holds no Web Lock and stays read-only.
- Data screen ("Данные"): folder, last save, version, backups with restore, export to JSON,
  import with a summary and confirmation (4.7), change folder.
- `memoryStorage` for unit and e2e tests; e2e tests on the real adapter with an OPFS folder.
- Dependency: `zod` (runtime, SPEC 6.1).

### Changed

- The seed data (with flags) is loaded with a dynamic import, only when a new folder is
  created; it is now a separate 432 KB chunk instead of part of the main bundle.
- The year and format are saved in the data file's `settings`.
- SPEC 4.2–4.7, 5.1, 6.3 and 7.2 updated with the approved M3 decisions, including the
  extended `Storage` interface.

### Demo

Open the app in Chrome, choose "Создать новую папку данных" and pick an empty folder: the
seed calendar appears and `kalendar-data.json` is written there. Change the year, reload, press
"Продолжить работу": the year is kept and `backups/` has a copy. "Данные" exports and imports
JSON and lists the backups. A second tab says "Приложение уже открыто в другом окне".

## [0.3.0] — 2026-11-21 — M2 PDF export

### Added

- `src/render/pdf/renderPdf.ts`: draws a `LayoutResult` into a jsPDF document of exactly the
  page size (3.1): vector rectangles, lines and the check-mark path, real text with embedded
  PT Sans Narrow (selectable, searchable Cyrillic), rotated and clipped text, flags as PNG stored
  once per image and reused.
- Browser-side assets (`pdfAssets.ts`): the bundled TTF files, SVG flags rasterised to PNG.
- Toolbar: "Печать" (opens the PDF in a new tab; downloads it if the browser blocks the tab) and
  primary "Скачать PDF" (`Kalendar_<title>_<format>.pdf`). jsPDF is loaded on first use, in its
  own chunk.
- Unit tests that parse the PDF with pdfjs-dist (page size, every text shape, embedded fonts,
  image reuse, anchors of right-aligned and rotated text, clip operators); e2e tests download
  each format and check file name, page size and event names, and check the print tab.
- Dependencies: `jspdf` (runtime, SPEC 6.1), `pdfjs-dist` (dev, PDF parser for tests).

### Changed

- Text is measured without kerning (canvas, fontkit test measurer, SVG preview) because jsPDF
  does not kern; preview and PDF now match glyph for glyph. SPEC 3.7 updated (approved).
- One shared canvas measurer for the preview and the PDF export.
- Held mark: drawn as a vector check-mark path (new `path` shape) sized to the name's cap height
  and counted in wrapping; PT Sans Narrow has no ✓ glyph.
- SPEC: approved M1 review decisions (clip on text shapes and the `path` shape in 6.3, sizes
  in 3.2–3.3 and 3.6, held-mark rule, per-day lane width backlog item, seed dynamic import in M3).

### Demo

Open the app, pick a format, press "Скачать PDF": the downloaded PDF matches the preview and its
text can be selected and searched. "Печать" opens it in a new tab for the print dialog.

## [0.2.0] — 2026-11-20 — M1 Domain and layout engine

### Added

- `src/domain`: ISO date arithmetic without `Date` objects, Orthodox Easter, Belarus default
  holidays (Appendix B), palette (Appendix C), events → segments → clusters → lanes (SPEC 3.5),
  name-uniqueness and in-use rules.
- `src/layout`: page formats and geometry (3.1–3.4), text wrapping and fitting with the full
  fallback order (3.6), `layoutCalendar` → `LayoutResult` with hit rectangles, grid geometry and
  warnings (5.7). Pure and deterministic; the `TextMeasurer` and export date are injected.
- Seed data (Appendix A) in `src/storage/seed.json`; 30 country flags from `flag-icons` (MIT)
  generated into `src/storage/seedFlags.json` by `scripts/genFlags.ts`.
- PT Sans Narrow Regular/Bold TTF + OFL licence bundled in `src/render/fonts/`.
- Read-only SVG preview of the seed data in all four formats, with year and format selection
  in the toolbar; minimal Zustand store (`zustand` runtime dependency, SPEC 6.1).
- Unit tests for dates, Easter 2020–2035, holidays, segments and lanes, text fitting (every
  fallback step), layout invariants, the reference cells and seed data; 90 % line coverage
  threshold (currently 100 %). E2E tests render each format.

### Demo

Open the app: the 2027 year view shows the nine reference exhibitions in the same cells as
`docs/reference/KALENDAR_2027.pdf`; switch the format and year in the toolbar.

## [0.1.0] — 2026-11-19 — M0 Project skeleton

### Added

- Vite + React 19 + TypeScript (strict) project with the folder structure of SPEC §6.2.
- ESLint (typescript-eslint strict, react-hooks; purity rules for `src/domain` and `src/layout`),
  Prettier, Vitest, Playwright (Chromium).
- GitHub Actions CI (lint, format check, typecheck, unit, build, e2e) and GitHub Pages deployment
  from `main`; Dependabot for npm and Actions.
- `README.md`, `CHANGELOG.md`; `CLAUDE.md` and `docs/SPEC.md` in place.

### Changed

- Reference PDF renamed to `docs/reference/KALENDAR_2027.pdf` to match the spec.

### Demo

Open <https://cor3man.github.io/kalendar-vystavok/>: the page shows "Календарь выставок" and
"Версия v0.1.0" in the footer.
