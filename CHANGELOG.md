# Changelog

All notable changes to this project are documented here.
Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow [SemVer](https://semver.org/).

## [Unreleased]

### Changed

- Held mark: drawn as a vector check-mark path (new `path` shape) sized to the name's cap height
  and counted in wrapping; PT Sans Narrow has no ✓ glyph.
- SPEC: approved M1 review decisions (clip on text shapes and the `path` shape in 6.3, sizes
  in 3.2–3.3 and 3.6, held-mark rule, per-day lane width backlog item, seed dynamic import in M3).

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
