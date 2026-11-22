// Performance budgets (SPEC 7.1). Locally the tests enforce the SPEC budgets exactly. Shared CI
// runners are slower and noisier than a typical office PC, so on CI (process.env.CI) a test may
// take up to twice the budget. Measured times are always logged, so a CI run still shows how
// close the app is to the real budget.

export const PERF_BUDGET_FACTOR = process.env.CI ? 2 : 1;

/** The limit a test enforces for a SPEC budget in this environment. */
export function perfLimit(budgetMs: number): number {
  return budgetMs * PERF_BUDGET_FACTOR;
}

/** One log line: measured time, SPEC budget and the enforced limit. */
export function perfReport(name: string, measuredMs: number, budgetMs: number): string {
  const limit = perfLimit(budgetMs);
  const ci =
    PERF_BUDGET_FACTOR === 1 ? '' : ` (CI ×${String(PERF_BUDGET_FACTOR)}: ${String(limit)} ms)`;
  return `performance: ${name} ${measuredMs.toFixed(0)} ms, budget ${String(budgetMs)} ms${ci}`;
}
