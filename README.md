# Kalendar vystavok

Static web app for keeping a company's exhibition calendar and printing it as an A3 / A4 PDF.
All data stays in a local folder on the user's computer. The full specification is in
[docs/SPEC.md](docs/SPEC.md); the rules for the coding agent are in [CLAUDE.md](CLAUDE.md).

Live build: <https://cor3man.github.io/kalendar-vystavok/>

## Development setup

Requirements: Node.js 26 LTS (see `.nvmrc`) and npm.

```sh
npm ci
npx playwright install chromium   # once, for e2e tests
npm run dev                       # http://localhost:5173/kalendar-vystavok/
```

## Scripts

| Script                 | What it does                                       |
| ---------------------- | -------------------------------------------------- |
| `npm run dev`          | Vite dev server                                    |
| `npm run build`        | Typecheck and production build into `dist/`        |
| `npm run preview`      | Serve `dist/` on port 4173                         |
| `npm test`             | Unit tests (Vitest), `tests/unit/`                 |
| `npm run test:e2e`     | E2E tests (Playwright, Chromium) against the build |
| `npm run lint`         | ESLint                                             |
| `npm run typecheck`    | TypeScript, no emit                                |
| `npm run format`       | Prettier, write                                    |
| `npm run format:check` | Prettier, check only (used in CI)                  |
| `npm run check`        | lint, format check, typecheck, unit tests          |
| `npm run icons`        | Regenerate the app icons from `public/icon.svg`    |

Before every commit: `npm run check` must pass (it stops at the first failing step). Do not pipe
it through `tail` or similar without `set -o pipefail`, or a failure is hidden.

### Testing the data folder

The app keeps its data in a folder picked through the File System Access API (SPEC 4.2), which
Playwright cannot drive. E2E tests therefore either

- inject in-memory storage with an init script:
  `window.__KALENDAR_TEST__ = { storage: 'memory' }` (see `tests/e2e/helpers.ts`), or
- stub `showDirectoryPicker` to return a folder of the origin private file system, so the real
  adapter, permissions and atomic writes run (see `tests/e2e/storage.spec.ts`).

The flag is not reachable from a URL. E2E specs have their own `tsconfig.e2e.json` with DOM
types, because code passed to `page.evaluate` runs in the browser.

Locally, Playwright reuses a preview server that is already running on port 4173 and then
skips its own build: run `npm run build` first, or stop that server, or the tests run against
an old `dist/`.

Other e2e notes:

- Service workers are blocked in every spec except `pwa.spec.ts`, which tests install,
  offline use and the update banner. It simulates a new deploy by changing one character of
  `dist/sw.js` (and restores it), because Playwright cannot intercept the browser's
  service-worker update check.
- `performance.spec.ts` checks the time budgets of SPEC 7.1 with 10 years of data. It runs in
  its own Playwright project after all other tests, so nothing competes for the CPU.
- `a11y.spec.ts` runs axe (WCAG A/AA) on every screen and dialog; `keyboard.spec.ts` uses the
  app without the mouse.

## PWA

`vite-plugin-pwa` with `registerType: 'prompt'` and an own service worker, `src/sw.ts`
(`injectManifest`; the `generateSW` template breaks on a project path with an apostrophe).
It precaches the whole build (fonts, seed and jsPDF chunks included), so after the first visit
everything works offline. `src/pwa/registerSw.ts` reports a waiting version to
`src/state/updateStore.ts`; the banner "Доступна новая версия — Обновить" saves pending
changes, activates the new version and reloads only while no dialog is open. An open app checks
for a new version every hour.

Icons: edit `public/icon.svg`, run `npm run icons`, commit the generated PNGs and `favicon.ico`.

## Project layout

See SPEC §6.2. `src/domain` and `src/layout` are pure TypeScript (enforced by ESLint).
UI strings live only in `src/i18n/ru.ts`.

## CI and deployment

`.github/workflows/ci.yml` runs on every push and pull request:
install → lint → format check → typecheck → unit tests → build → e2e against the build.
On `main`, after CI passes, `dist/` is deployed to GitHub Pages.
Vite `base` is `/kalendar-vystavok/`.

One-time repository setup:

1. The repository must be public (free GitHub Pages).
2. Settings → Pages → Build and deployment → Source: **GitHub Actions**.

Dependabot (`.github/dependabot.yml`) checks npm and GitHub Actions weekly.

## Versioning

Semantic version in `package.json`, shown in the app footer. Changes are recorded by hand in
[CHANGELOG.md](CHANGELOG.md).

Release steps:

1. Bump `version` in `package.json` (and `package-lock.json`, via `npm version <x.y.z>
--no-git-tag-version`), add the `CHANGELOG.md` entry.
2. `npm run check`, `npm run build`, `npm run test:e2e`: all green.
3. Merge the pull request to `main`; CI deploys to GitHub Pages.
4. Tag the merge commit: `git tag v<x.y.z>` and `git push origin v<x.y.z>`.
5. Before a release for the secretary: print one A3 and one A4 page on the office printer and
   open the app on her PC (SPEC 7.2 manual checks). Open apps show the update banner within an
   hour, or on the next start.

The user guide for the secretary is [docs/USER_GUIDE.ru.md](docs/USER_GUIDE.ru.md).
