# Kalendar vystavok — agent rules

## Source of truth
- docs/SPEC.md is the specification. Follow it exactly. If something is unclear or seems wrong, stop and ask; do not guess.
- Work milestone by milestone (SPEC §8). Stop after each milestone and report: what was done, how it was tested, what is open.

## Commands
- npm run dev | build | preview | test | test:e2e | lint | typecheck | format | check
- Before every commit: lint, typecheck, test must pass. Run `npm run check` (lint, format check,
  typecheck, unit tests; stops at the first failure) and commit only if it exits 0.
- Never pipe a gate command through `tail`, `head`, `grep` or similar: the pipe returns the last
  command's exit code and hides the failure. If output must be shortened, run it in bash with
  `set -o pipefail` and check the exit code.

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