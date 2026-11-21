# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

## [0.4.0] — 2026-11-21 — M3 Storage

### Added

- Data folder (SPEC 4.2): start screen with "Создать новую папку данных" / "Открыть
  существующую", one-click "Продолжить работу" for the remembered folder (handle in IndexedDB),
  "Выбрать другую папку". Creating never overwrites a folder that already has data. Browsers
  without File System Access get the "unsupported" screen.
- Autosave (4.3), debounced 800 ms, with a status in the toolbar. Writes are atomic
  (`createWritable`). Backups: one on every app start, at most one per 10 minutes while
  editing, newest 30 kept. External changes are detected by `lastModified`; autosave stops and
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
