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

Before every commit: `lint`, `typecheck` and `test` must pass.

### Testing the data folder

The app keeps its data in a folder picked through the File System Access API (SPEC 4.2), which
Playwright cannot drive. E2E tests therefore either

- inject in-memory storage with an init script:
  `window.__KALENDAR_TEST__ = { storage: 'memory' }` (see `tests/e2e/helpers.ts`), or
- stub `showDirectoryPicker` to return a folder of the origin private file system, so the real
  adapter, permissions and atomic writes run (see `tests/e2e/storage.spec.ts`).

The flag is not reachable from a URL. E2E specs have their own `tsconfig.e2e.json` with DOM
types, because code passed to `page.evaluate` runs in the browser.

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
