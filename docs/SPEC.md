# Календарь выставок — Specification v1.0

Nov 19, 2026 · @Aleks

## 1. Overview

The app replaces hand-editing a PDF: one secretary keeps the company's exhibition calendar in a browser app and prints it as an A3 or A4 PDF. It is a static web app hosted for free, installable in Chrome, working offline, with all data kept in a folder on her computer.

**Problem today.** Every time the manager asks, the calendar PDF is edited by hand: coloured blocks, names, cities and flags placed manually. It is slow and error-prone.

**Users.** One secretary, Russian-speaking, non-technical, on a Windows PC with Chrome. A developer (Aleks) maintains the app.

**In scope (v1.0)**

- Generate a calendar for a chosen year in four page formats, with weekends and holidays.
- Add, edit, delete exhibitions by selecting days directly on the calendar.
- Mark an exhibition as held.
- Keep a catalogue of exhibitions (name, logo, usual city and country, colour) and a list of countries with flags.
- Edit holidays.
- Export a print-ready vector PDF.
- Safe local storage: autosave, backups, undo.

**Out of scope (v1.0)** — see Appendix E for the backlog.

- Multiple users, sharing, any server or cloud database.
- Google Sheets storage.
- CMYK or print-shop output (bleeds, crop marks).
- "Dates not confirmed" marks.
- Languages other than Russian in the UI.

**Glossary**

| Term | Meaning |
| --- | --- |
| Exhibition | A catalogue entry: a recurring trade show, e.g. "ТрансРоссия". Holds name, short name, logo, defaults |
| Event | One occurrence of an exhibition: dates, city, country, colour, held flag |
| Segment | The part of an event inside one month column. An event crossing a month boundary has two segments |
| Primary segment | The longest segment of an event (earlier one on a tie). Only it shows city, flag and logo |
| Lane | A vertical strip of a month column. Overlapping events share a column in equal lanes |
| Data folder | The folder the secretary picks once. Holds the data file and its backups |
| Reference PDF | `docs/reference/KALENDAR_2027.pdf`, the hand-made calendar this app replaces |

## 2. Decisions

All design questions are settled; the agent must not reopen them without asking.

| # | Topic | Decision |
| --- | --- | --- |
| 1 | Browser | Chrome on Windows (Edge also works). Other browsers get a clear "not supported" screen |
| 2 | Printing | Office printer, A3 and A4. Page margin 8 mm on all sides |
| 3 | Data location | A data folder the user picks; recommended inside a Google Drive / OneDrive synced folder for off-site backup |
| 4 | Formats | Four: year (A3 landscape), H1 and H2 (A4 portrait), H2 + next year's H1 (A3 landscape) |
| 5 | Holidays | Belarus by default; editable in the app; working Saturdays not marked |
| 6 | Held events | Shown with a "✓" before the name in the calendar and the PDF; greyed in the list |
| 7 | Three overlaps | Column split in three equal lanes, plus a warning in the app |
| 8 | Space shortage | Fallback order defined in 3.6; the name and flag are never dropped |
| 9 | Font | PT Sans Narrow (Regular, Bold), SIL OFL, Cyrillic. TTF files bundled |
| 10 | Header | Year (or "2027–2028") at top left; "Обновлено: DD.MM.YYYY" small at top right |
| 11 | "2026" marks in the reference | Not implemented (backlog) |
| 12 | Colours | Fixed palette of 10 plus a custom colour picker. Colours have no fixed meaning |
| 13 | Data model | Exhibition catalogue + events, see 4.1 |
| 14 | Copy to next year | Yes, for a single event |
| 15 | Starting data | Pre-filled with the 2027 events of the reference PDF (Appendix A) |
| 16 | Undo | Undo / redo of the last 20 changes, plus file backups |
| 17 | Export | PDF; JSON backup export and import. No Excel |
| 18 | Language | TypeScript (strict) |
| 19 | UI framework | React |
| 20 | Tests | Unit (Vitest) + end-to-end (Playwright). PDF snapshot tests postponed (backlog) |
| 21 | Languages | Code, comments, docs: English. UI: Russian |
| 22 | Hosting | GitHub Pages from a public GitHub repo, deployed by GitHub Actions on every push to `main`. No custom domain |
| 23 | Install / offline | Installable PWA, fully usable offline after the first visit; "new version available" prompt |
| 24 | Versioning | Semantic version shown in the app; `CHANGELOG.md` kept by hand |

## 3. Calendar layout

One layout engine computes the page as a list of shapes in millimetres; the on-screen preview (SVG) and the PDF both draw from that list, so they always match. All sizes below are in mm; font sizes are cap-independent em sizes in mm.

### 3.1 Page formats

| Format id | Months | Paper | Size (w × h) | Title |
| --- | --- | --- | --- | --- |
| `year` | Jan–Dec of Y | A3 landscape | 420 × 297 | `Y` |
| `h1` | Jan–Jun of Y | A4 portrait | 210 × 297 | `Y` |
| `h2` | Jul–Dec of Y | A4 portrait | 210 × 297 | `Y` |
| `split` | Jul–Dec of Y, Jan–Jun of Y+1 | A3 landscape | 420 × 297 | `Y–Y+1`; small "Y+1" above the Jan column |

### 3.2 Page structure

- Margin M = 8 on all sides.
- Title: top left, bold, magenta `#E6007E`; 14 on A3, 11 on A4. "Обновлено: DD.MM.YYYY" at top right, 3, grey `#777`, date = day of export.
- Month header band: height 8, fill `#2B2B2B`, month names in white bold capitals, centred; 4.6 on A3, 3.6 on A4.
- Grid: one column per month (equal widths), 31 rows (equal heights) filling the rest of the page. Days that do not exist (e.g. 30 Feb) are empty cells.
- Grid lines: 0.2 wide, colour `#2A1F8F`, drawn **above** all fills so every day border stays visible inside events.
- Background year: the 4-digit year (for `split`: Y), bold, colour `#E2E2E2`, anchored to the grid's bottom right, sized so its width is one third of the grid width (about 4 months on A3). Drawn below all fills.

### 3.3 Day cell

- Day number at left (regular, 2.7) followed by the weekday abbreviation (Пн Вт Ср Чт Пт Сб Вс, regular, 1.5), vertically centred, 1.3 from the left edge.
- Saturdays, Sundays and holidays: number and weekday in magenta `#E6007E`; other days `#151515`.
- The **number zone** is the left 7.4 of each cell; event text never enters it.

### 3.4 Holidays

- A holiday colours its number magenta (3.3).
- A holiday with a label also fills the whole cell with `#F9C3CB` and shows the label right-aligned, bold, `#E3311A`, max 3.3, shrinking to fit (min 1.6).
- If an event covers a holiday cell, the event fill wins; the number stays magenta; the label is hidden.

### 3.5 Events, segments and lanes

1. Split each event into segments, one per month column it touches (an event from 31 Mar to 2 Apr has two). Events reaching outside the page's months are cut to the visible part.
2. Within a column, sort segments by start day, then longer first. Group segments that overlap (directly or through a chain) into a cluster.
3. Assign lanes greedily: each segment takes the lowest lane free on its days. The cluster's lane count n = lanes used.
4. Each lane is colW / n wide; lane i starts at column x + i × colW / n. **Equal split**, the number zone belongs to lane 0.
5. Fill each segment's rectangle (lane width × its days) with the event colour.
6. n ≥ 3 is allowed; the app lists a warning for it (5.7).

### 3.6 Event content and fitting

Text area of a segment: from the lane's left edge (lane 0: from the end of the number zone) + 0.8 to the lane's right edge − 1.0, full height of the segment. Only the **primary segment** shows city, flag and logo; other segments show the name only.

**Horizontal layout (preferred)**

- Name: bold, right-aligned, top-aligned 0.6 below the segment top, word-wrapped, max 4 lines, line height 1.15 × size. Size: largest of 3.4 → 2.1 in 0.1 steps that fits. Manual line breaks from the short name (4.1) are respected.
- "✓ " (with a non-breaking space) precedes the name of a held event.
- Logo (optional): centred below the name in the space left above the bottom row; height up to 2.2 × row height, aspect kept, only if at least 2.5 high is available.
- Bottom row (segments of 2+ days): flag at the right edge (height min(3.4, 0.42 × row), width by the flag's aspect, max 2 × height, 0.08 grey border); city right-aligned immediately left of the flag with a 1.0 gap, bold, 3.0 shrinking to 1.6.
- One-day segment: name and flag share the row; city is omitted.

**Fallback order** when the horizontal layout does not fit at the minimum name size:

1. Horizontal without the logo.
2. Vertical: text rotated 90° counter-clockwise (reads bottom to top), lines stacked left to right, name lines then the city line, each line aligned to the segment's top; size 3.4 → 1.5; the flag stays horizontal at the bottom right.
3. Vertical without the city.
4. Vertical name at 1.5, clipped to the segment, and a "text does not fit" warning (5.7).

### 3.7 PDF output

- Library: jsPDF. Vector output: rectangles, lines and text as vector; text as real text with embedded PT Sans Narrow (selectable, searchable).
- Images (flags, logos) embedded as PNG, each image stored once and reused.
- Page size exactly as 3.1; no scaling; file name `Kalendar_<title>_<format>.pdf`, e.g. `Kalendar_2027_year.pdf`.
- Two actions: "Скачать PDF" (download) and "Печать" (opens the PDF in a new tab for the browser's print dialog).
- The PDF must be pixel-identical in structure to the on-screen preview (same shapes from the same layout result).

## 4. Data model and storage

All data lives in one JSON file inside a data folder on the secretary's computer; the hosted app never sends data anywhere. Writes are atomic, backups are kept automatically, and the file carries a schema version for future upgrades.

### 4.1 Entities

```ts
type ISODate = string;          // 'YYYY-MM-DD', calendar date, no time zone
type Id = string;               // random, e.g. nanoid(10)
type ImageData = {              // embedded image
  dataUrl: string;              // 'data:image/png;base64,...' (PNG or SVG)
  width: number; height: number // pixels, for the aspect ratio
};

type Country = { id: Id; name: string; flag: ImageData | null };

type Exhibition = {
  id: Id;
  name: string;                 // full name, e.g. 'Transport logistic'
  shortName: string;            // text printed in the calendar; '\n' = forced line break, max 4 lines
  logo: ImageData | null;
  defaultCity: string;
  defaultCountryId: Id | null;
  defaultColor: string;         // '#RRGGBB'
};

type Event = {
  id: Id;
  exhibitionId: Id;
  start: ISODate; end: ISODate; // inclusive, end >= start
  city: string;                 // prefilled from the exhibition, editable
  countryId: Id | null;
  color: string;                // '#RRGGBB'
  held: boolean;
  note: string;                 // internal, never printed
};

type Holiday = { date: ISODate; label: string };   // label '' = number turns red only

type DataFile = {
  app: 'kalendar-vystavok';
  schemaVersion: 1;
  savedAt: string;              // ISO timestamp
  appVersion: string;           // semver of the app that saved it
  countries: Country[];
  exhibitions: Exhibition[];
  events: Event[];
  holidays: Holiday[];
  settings: { lastYear: number; lastFormat: 'year' | 'h1' | 'h2' | 'split' };
};
```

Rules: an exhibition or country in use by an event cannot be deleted (the app explains which events use it). Names are unique, case-insensitive. Images are resized on import: logos to max 600 × 300 px, flags to max 160 × 120 px; max 200 KB each.

### 4.2 Data folder

```
<data folder>/
  kalendar-data.json              current data
  backups/
    kalendar-data_2027-03-14_10-22-05.json
    ...                           newest 30 kept, older deleted
```

- First run: the user chooses "Создать новую папку данных" (creates the file with seed data, Appendix A) or "Открыть существующую" (picks a folder containing `kalendar-data.json`).
- Access uses the File System Access API (`showDirectoryPicker`, read-write). The folder handle is stored in IndexedDB; on later starts the app asks for permission with one click ("Продолжить работу").

### 4.3 Saving

- Autosave after every change, debounced 800 ms; a status indicator shows "Сохранено" / "Сохранение…" / "Ошибка сохранения".
- Atomic write: `createWritable()` writes to a temporary file that replaces the original only on `close()`; a crash never leaves a half-written file.
- Before overwriting, the previous file is copied to `backups/` (at most one backup per 10 minutes of editing, plus one on every app start).
- External change check: before each write, compare the file's `lastModified` with the value at last read. If it changed (e.g. a sync tool or another computer), stop autosave and ask: reload from disk, or overwrite.
- On save failure: keep the data in memory, show a persistent error banner, retry on the next change, offer "Скачать резервную копию" (JSON download).

### 4.4 Loading and validation

- The file is parsed and validated with a schema (zod). Invalid file: do not overwrite it; show the error and offer to open the newest valid backup.
- Unknown higher `schemaVersion`: open read-only with a message "файл создан более новой версией приложения".

### 4.5 Migrations

- `migrations/` holds one pure function per version step (`v1 → v2`, …). On load, steps run in order; the result is validated, a backup of the original is written, then saved.
- Every schema change requires a migration and a unit test with a real old-version fixture.

### 4.6 One tab at a time

- The app takes a Web Lock named `kalendar-data`. A second tab or window that cannot get it shows "Приложение уже открыто в другом окне" and stays read-only.

### 4.7 Backup export and import

- "Экспорт" downloads the current data as JSON. "Импорт" loads a JSON file, validates and migrates it, shows a summary (counts per entity), and replaces the data after confirmation (the old data goes to `backups/` first).

## 5. UI and interaction

The main screen is the calendar itself: the secretary selects days with the mouse to add an exhibition and clicks an exhibition to edit it. All UI text is Russian; dates are shown as DD.MM.YYYY or "16–18 марта 2027".

### 5.1 Screens

| Screen | Purpose |
| --- | --- |
| Start | Shown when no data folder is connected: "Создать новую папку данных", "Открыть существующую", short explanation. Or one button "Продолжить работу" when a folder is remembered |
| Unsupported | Browser without File System Access: says to open the app in Chrome or Edge |
| Main | Toolbar, calendar preview, warnings panel, event list |
| Event dialog | Add / edit one event |
| Catalogue | Exhibitions and countries, tabs |
| Holidays | Holiday list for the selected year(s) |
| Data | Folder name, last save, backups list, export / import, change folder, app version |

### 5.2 Main screen

- **Toolbar:** year (number input with ‹ ›), format (4 options, 3.1), "+ Выставка", undo / redo, "Каталог", "Праздники", "Данные", save status, "Печать", "Скачать PDF" (primary).
- **Preview:** the page exactly as printed (3.x), scaled to the window width, minimum 900 px wide with horizontal scroll.
- **Warnings panel:** listed only when present (5.7); clicking a warning opens that event.
- **Event list:** exhibitions of the visible period sorted by start date: colour swatch, name, dates, city, country, held state. Click opens the event dialog.

### 5.3 Selecting days

- Press on a day cell, drag to another day, release: the dialog opens for a new event with these dates. The range runs in date order and may cross month columns (31 Mar → 2 Apr).
- While dragging, selected days are highlighted (magenta 18 % fill, magenta outline) and a tooltip shows the range ("31 марта – 2 апреля 2027").
- Click (press and release on one cell) on an event: opens it for editing. Click on an empty day: new one-day event.
- Selecting over existing events is allowed (creates an overlap).
- Esc during a drag cancels it. Cursor: cell cursor over days, pointer over events.
- Pointer events (mouse, pen, touch). Selection must stay correct after scrolling and resizing.

### 5.4 Event dialog

| Field | Control | Rules |
| --- | --- | --- |
| Exhibition | Combobox over the catalogue, type to search | Required. Picking one prefills city, country, colour. Typing a new name offers "Создать выставку «…»" (adds it to the catalogue with these values) |
| Start, end | Date inputs | Required; end ≥ start (swapped automatically) |
| City | Text with suggestions from earlier events | Optional |
| Country | Select with flag thumbnails | Optional |
| Colour | 10 swatches + custom picker | Required, default from the exhibition |
| Held | Checkbox "Выставка проведена" |  |
| Note | Text area | Internal, not printed |

Buttons: "Сохранить" (Enter), "Отмена" (Esc); in edit mode also "Удалить" and "Копировать на следующий год" (same weekdays a year later, i.e. +364 days, shown for confirmation and editable). Delete needs no confirmation dialog because it can be undone; a toast "Удалено. Отменить" appears for 8 s.

### 5.5 Catalogue

- **Exhibitions tab:** list with logo thumbnail, name, short name, defaults, number of events. Add / edit / delete. Short name is a 4-line text area with a live preview of how it wraps in a 3-day cell.
- **Countries tab:** list with flag, name. Add / edit (upload a PNG, JPG or SVG flag) / delete. 30 countries preloaded (Appendix A).

### 5.6 Undo and redo

- Every data change (event, exhibition, country, holiday, import) is one undoable step; the last 20 are kept in memory for the session.
- Ctrl+Z / Ctrl+Y (Ctrl+Shift+Z) and toolbar buttons. Undo is saved like any other change.

### 5.7 Warnings

| Warning | When |
| --- | --- |
| «Текст не помещается» | Fallback step 4 reached (3.6) |
| «Три и более выставки в один день» | A cluster with n ≥ 3 (3.5) |
| «Нет флага» | The event's country has no flag |
| «Нет праздников на год» | No holiday defined in a visible year |

Warnings never block printing.

### 5.8 Holidays

- Table of the visible years: date, label, delete. Add a row; "Заполнить праздниками Беларуси" generates the default list for a year (Appendix B) without duplicating existing dates.
- On first creation of the data folder, holidays for the current year and the next two are generated.

### 5.9 Updates and accessibility

- When a new app version is deployed, a banner offers "Доступна новая версия — Обновить"; it never reloads on its own while a dialog is open.
- All controls reachable by keyboard; visible focus; dialogs trap focus and return it; contrast AA for UI text.

## 6. Architecture and tech stack

The app is a static React + TypeScript single-page app built by Vite. Three boundaries keep it maintainable: pure domain logic (dates, layout) with no browser or React code, renderers that only draw shapes, and storage behind an interface.

&#91;embedded content: architecture · 8 parts, data flows top to bottom\]

The UI changes data only through the store; the store saves only through the Storage interface; the preview and the PDF draw the same layout result, and the preview feeds clicks back to the UI.

### 6.1 Stack

| Concern | Choice |
| --- | --- |
| Language | TypeScript, `strict: true`, no `any` without a comment |
| Build | Vite |
| UI | React 19, function components and hooks |
| State | Zustand store with an undo history (20 steps) |
| Validation | zod schemas for the data file |
| PDF | jsPDF |
| PWA | vite-plugin-pwa, `registerType: 'prompt'` |
| Styling | CSS Modules, design tokens as CSS variables |
| Unit tests | Vitest |
| E2E tests | Playwright (Chromium) |
| Lint / format | ESLint (typescript-eslint, react-hooks), Prettier |
| CI / hosting | GitHub Actions → GitHub Pages |

Runtime dependencies beyond these need a reason in the pull request.

### 6.2 Project structure

```
kalendar-vystavok/
  CLAUDE.md                 rules for the coding agent (Appendix D)
  CHANGELOG.md
  README.md                 dev setup, scripts, deploy
  docs/
    SPEC.md                 this specification
    USER_GUIDE.ru.md        short guide for the secretary (Russian)
    reference/KALENDAR_2027.pdf
  public/                   icons, manifest assets
  src/
    main.tsx, App.tsx
    domain/                 pure TS, no DOM, no React
      types.ts              entities (4.1)
      dates.ts              ISO dates, ranges, weekdays, Orthodox Easter
      holidays.ts           Belarus defaults (Appendix B)
      segments.ts           events → segments → lanes (3.5)
      validation.ts         business rules (unique names, in-use checks)
    layout/                 pure TS
      pageSpec.ts           formats and geometry (3.1, 3.2)
      textFit.ts            wrapping, fitting, fallback order (3.6)
      layout.ts             data + year + format → LayoutResult
      measure.ts            TextMeasurer interface (font metrics)
    render/
      svg/CalendarSvg.tsx   LayoutResult → SVG preview
      pdf/renderPdf.ts      LayoutResult → jsPDF document
      fonts/                PT Sans Narrow TTF + OFL licence
    storage/
      Storage.ts            interface
      fsAccessStorage.ts    data folder via File System Access
      memoryStorage.ts      for tests and demo
      schema.ts             zod schema of DataFile
      migrations/           v1 → v2 …
      seed.ts               seed data (Appendix A)
    state/
      store.ts              Zustand store, actions, undo history
      autosave.ts
    ui/
      toolbar/, calendar/, dialogs/, catalogue/, holidays/, data/, common/
    i18n/ru.ts              all UI strings
  tests/
    unit/                   mirrors src/domain, src/layout, src/storage
    e2e/                    Playwright specs
    fixtures/               data files incl. old schema versions
```

### 6.3 Key interfaces

```ts
// layout output: everything is in mm, origin top-left
type Shape =
  | { kind: 'rect'; x: number; y: number; w: number; h: number; fill: string }
  | { kind: 'line'; x1: number; y1: number; x2: number; y2: number; stroke: string; width: number }
  | { kind: 'text'; x: number; y: number; text: string; size: number; bold: boolean;
      color: string; rotate: 0 | 90; align: 'left' | 'right' | 'center' }
  | { kind: 'image'; x: number; y: number; w: number; h: number; image: ImageData; border: boolean };

type LayoutResult = {
  page: { w: number; h: number; formatId: FormatId; title: string };
  shapes: Shape[];                       // in drawing order
  grid: GridGeometry;                    // for hit-testing day cells
  hits: { eventId: Id; x: number; y: number; w: number; h: number }[];
  warnings: Warning[];
};

function layoutCalendar(input: {
  data: DataFile; year: number; format: FormatId; exportDate: ISODate; measurer: TextMeasurer;
}): LayoutResult;

interface TextMeasurer { width(text: string, size: number, bold: boolean): number }
// production: canvas measureText with the loaded font; tests: fontkit-based measurer on the same TTF

interface Storage {
  status(): Promise<'none' | 'needs-permission' | 'ready'>;
  connect(mode: 'create' | 'open'): Promise<void>;
  load(): Promise<DataFile>;
  save(data: DataFile): Promise<void>;          // atomic, with backup policy (4.3)
  listBackups(): Promise<BackupInfo[]>;
  restoreBackup(name: string): Promise<DataFile>;
}
```

The layout must be deterministic: the same input gives the same shapes, so it can be unit-tested without a browser.

### 6.4 Build, CI and deployment

- Scripts: `dev`, `build`, `preview`, `test`, `test:e2e`, `lint`, `typecheck`, `format`.
- CI on every push and pull request: install → lint → typecheck → unit tests → build → e2e against the build.
- On `main`, after CI passes: deploy `dist/` to GitHub Pages. Vite `base` = `/kalendar-vystavok/`.
- The app version comes from `package.json` and is shown in the Data screen and the footer.
- Dependabot for npm and GitHub Actions, weekly.

## 7. Quality

The app must never lose data, must print exactly what the preview shows, and must stay responsive with a decade of data.

### 7.1 Non-functional requirements

| Area | Requirement |
| --- | --- |
| Data safety | No data loss on crash, closed tab or failed write (4.3); every destructive action undoable or backed up |
| Privacy | No network requests except loading the app itself; no analytics, no external fonts or CDNs at runtime |
| Offline | After the first visit, every feature works with no network |
| Browsers | Current Chrome and Edge on Windows 10/11 (last 2 major versions) |
| Performance | Layout + preview of a year with 200 events < 200 ms; PDF export < 3 s; app start < 2 s on a typical office PC |
| Data size | Works with 10 years of data (2 000 events, 300 exhibitions with logos) |
| Accessibility | Keyboard-only use possible; WCAG AA contrast for UI; dialogs announced to screen readers |
| Robustness | Invalid or partial input never crashes the app; errors shown in Russian with a next step |

### 7.2 Testing strategy

**Unit tests (Vitest)**, run in CI, coverage ≥ 90 % lines for `domain/`, `layout/`, `storage/` (except the File System Access adapter):

- Dates: month lengths, leap years, ISO parsing, ranges across months and years.
- Orthodox Easter for 2020–2035 against a known table; Radunitsa = Easter + 9 days.
- Segments and lanes: no overlap, two overlaps, chains (A overlaps B, B overlaps C), three at once, month and year boundaries, events outside the page.
- Text fitting: each fallback step reached with a constructed case; held "✓" never on its own line; manual line breaks.
- Layout invariants: no text shape inside a number zone; all shapes inside the page; same input gives identical output.
- Schema validation and every migration with fixtures; seed data valid.
- Store: each action and undo / redo of it.

**End-to-end tests (Playwright)** against the production build, with `memoryStorage` injected through a test flag:

- Create an event by dragging 3 days; it appears in the preview and the list.
- Drag across a month boundary.
- Edit by clicking an event; mark as held; "✓" appears.
- Delete, then undo from the toast.
- Copy to next year.
- Add an exhibition with a logo and a country with a flag (file upload).
- Each format renders; "Скачать PDF" downloads a file whose page size matches 3.1 and whose text includes the event names (checked with a PDF parser, not pixels).
- Second tab shows the read-only message.
- Offline: after the first load, reload with network off still works.

**Manual checks before each release:** print one A3 and one A4 page on the office printer; open the app on the secretary's PC.

**Postponed:** visual snapshot tests of the PDF (Appendix E).

## 8. Milestones

The agent builds the app in six milestones, in order; each ends with a green CI run, a deployed build and a short demo note in `CHANGELOG.md`. The agent stops after each milestone for review.

### M0 — Project skeleton

- [ ] Vite + React + TypeScript project with the structure of 6.2, ESLint, Prettier, Vitest, Playwright.
- [ ] GitHub Actions CI (6.4) and deployment to GitHub Pages; the deployed page shows the app name and version.
- [ ] `CLAUDE.md`, `README.md`, `docs/SPEC.md`, `CHANGELOG.md` in place.

### M1 — Domain and layout engine

- [ ] `domain/` and `layout/` implemented per 3.x with the unit tests of 7.2.
- [ ] Read-only SVG preview of the seed data for all four formats.
- [ ] Side by side with the reference PDF, the 2027 year view has the same events in the same cells.

### M2 — PDF export

- [ ] "Скачать PDF" and "Печать" per 3.7, fonts embedded, text selectable.
- [ ] E2E test checks page size and event names in the PDF.
- [ ] Printed A3 and A4 test pages approved by Aleks.

### M3 — Storage

- [ ] Start screen, data folder create / open, permission flow (4.2).
- [ ] Autosave, atomic write, backups, external change check, error handling (4.3).
- [ ] Validation, migrations framework, Web Lock, export / import (4.4–4.7).

### M4 — Editing

- [ ] Day selection (5.3), event dialog (5.4), catalogue (5.5), holidays (5.8).
- [ ] Undo / redo and the delete toast (5.6).
- [ ] Warnings panel (5.7); all e2e flows of 7.2 pass.

### M5 — Release 1.0

- [ ] PWA: installable, offline, update banner (5.9).
- [ ] Accessibility and performance checks of 7.1 pass.
- [ ] `docs/USER_GUIDE.ru.md`: install, first run, add / edit / print, backups.
- [ ] Version 1.0.0 tagged and deployed; secretary's PC set up and a real calendar printed.

### Definition of done (every milestone)

- [ ] Lint, typecheck, unit and e2e tests green in CI.
- [ ] No `TODO` without an issue link; no console errors in the app.
- [ ] Spec updated if behaviour differs from it (with Aleks's approval).
- [ ] `CHANGELOG.md` entry written.

## Appendix A — Seed data

Events read from the reference PDF; the agent verifies each date and text against `docs/reference/KALENDAR_2027.pdf` in M1. The reference spells "Траспорт"; the seed uses the correct "Транспорт".

| Exhibition | Start | End | City (as printed) | Country | Colour |
| --- | --- | --- | --- | --- | --- |
| ТрансРоссия | 16.03.2027 | 18.03.2027 | Москва | Россия | Сиреневый |
| Транспорт и Логистика форум | 31.03.2027 | 02.04.2027 | СПб | Россия | Светло-сиреневый |
| Transport logistic | 26.04.2027 | 29.04.2027 | Мюнхен | Германия | Серый |
| ЛогистикаЭкспо | 25.05.2027 | 28.05.2027 | Москва | Россия | Сиреневый |
| TransLogistica Caspian | 02.06.2027 | 04.06.2027 | Baku | Азербайджан | Серый |
| CeMAT Asia | 03.06.2027 | 05.06.2027 | Китай | Китай | Тёмно-серый |
| Транспорт и Логистика | 13.10.2027 | 15.10.2027 | Астана | Казахстан | Голубой |
| TransLogistica | 09.11.2027 | 11.11.2027 | Ташкент | Узбекистан | Голубой |
| Транспорт России | 17.11.2027 | 19.11.2027 | Москва | Россия | Светло-сиреневый |

Each row also creates its catalogue exhibition (short name = name, defaults = this row, no logo).

**Countries preloaded (30)**, flags from the `flag-icons` package (MIT), bundled at build time: Россия, Беларусь, Казахстан, Узбекистан, Азербайджан, Китай, Германия, Турция, ОАЭ, Кыргызстан, Армения, Грузия, Таджикистан, Туркменистан, Польша, Литва, Латвия, Италия, Франция, Испания, Нидерланды, Индия, Иран, Сербия, Египет, Вьетнам, США, Великобритания, Монголия, Саудовская Аравия.

## Appendix B — Default holidays (Belarus)

| Date | Label printed |
| --- | --- |
| 1 Jan, 2 Jan, 7 Jan | — |
| 8 Mar | — |
| Orthodox Easter (Sunday) | Пасха |
| Radunitsa (Easter + 9 days, Tuesday) | Радуница |
| 1 May, 9 May | — |
| 3 Jul | — |
| 7 Nov | 7 ноября |
| 25 Dec | — |

"—" = the number turns magenta, no label. For 2027: Easter 2 May, Radunitsa 11 May (matches the reference).

## Appendix C — Palette

| Name | Hex |
| --- | --- |
| Сиреневый | `#B3A7E0` |
| Светло-сиреневый | `#E4DFF6` |
| Голубой | `#CFE8F5` |
| Серый | `#D2D2D2` |
| Тёмно-серый | `#9C9C9C` |
| Розовый | `#F6CBD6` |
| Зелёный | `#CDE8C8` |
| Жёлтый | `#F7E8A4` |
| Оранжевый | `#F8D2A6` |
| Бирюзовый | `#BFE6E0` |

Event text is always `#151515`; a custom colour darker than 45 % luminance shows a contrast warning in the dialog.

## Appendix D — CLAUDE.md for the coding agent

```markdown
# Kalendar vystavok — agent rules

## Source of truth
- docs/SPEC.md is the specification. Follow it exactly. If something is unclear or seems wrong, stop and ask; do not guess.
- Work milestone by milestone (SPEC §8). Stop after each milestone and report: what was done, how it was tested, what is open.

## Commands
- npm run dev | build | preview | test | test:e2e | lint | typecheck | format
- Before every commit: lint, typecheck, test must pass.

## Architecture rules
- src/domain and src/layout are pure TypeScript: no DOM, no React, no browser APIs, no Date.now(). Inject the export date and the TextMeasurer.
- Renderers (svg, pdf) only draw a LayoutResult; they never compute layout.
- UI code reaches data only through the store; the store reaches disk only through the Storage interface.
- All UI strings live in src/i18n/ru.ts. No Russian text elsewhere in code; code and comments in English.
- Dates are ISO strings (YYYY-MM-DD) in data and domain code; never use local-time Date getters for calendar logic.

## Code style
- TypeScript strict. No any, no non-null assertions without a comment.
- Small pure functions with unit tests; one component per file.
- No new runtime dependency without stating why in the commit message.

## Tests
- Every bug fix starts with a failing test.
- Every schema change needs a migration + fixture test.
- Layout changes: add or update unit tests for the affected rule (SPEC §3).

## Git
- Conventional commits (feat:, fix:, test:, docs:, chore:).
- Update CHANGELOG.md in each milestone.
```

## Appendix E — Backlog (not in v1.0)

- Visual snapshot tests of the PDF output.
- "Dates not confirmed" mark (the rotated "2026" in the reference).
- Marking working Saturdays and moved days off.
- Google Sheets or cloud storage behind the Storage interface.
- Hiding held events from the printout as an option.
- Copying a whole year of events at once.
- CMYK / print-shop PDF.
- Upgrade to TypeScript 7 when typescript-eslint supports it.
