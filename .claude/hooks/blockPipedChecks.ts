// Claude Code PreToolUse hook (Bash and PowerShell tools): refuses commands that pipe a
// project check into tail/head/Select-Object, because the pipe hides the check's exit code.
// Runs with plain `node` (Node strips the types). Reads the hook JSON from stdin; exit 2 blocks.

export const BLOCK_REASON = "Don't pipe checks: the pipe hides failures. Run the command unpiped.";

// npm scripts and tools that act as gates (CLAUDE.md "Commands").
const CHECK_PATTERN =
  /(^|[\s;&(])(npm\s+(run(-script)?\s+(check|lint|typecheck|test|test:e2e|format:check|build)\b|(test|t)\b)|npx\s+(vitest|eslint|tsc|prettier|playwright)\b|(vitest|eslint|tsc|playwright)\b)/i;

// Output filters that swallow the exit code of the command before them.
const FILTER_PATTERN = /^(tail|head|select-object|select)\b/i;

// Bash with pipefail keeps the failing exit code, which CLAUDE.md allows.
const PIPEFAIL_PATTERN = /\bset\s+-\w*o\s+pipefail\b/;

/** Splits a command line into statements (on `;`, `&&`, `||`, newlines). */
function splitStatements(command: string): string[] {
  return command.split(/&&|\|\||;|\r?\n/);
}

/** Splits one statement into pipeline stages (on `|` and bash `|&`). */
function splitPipeline(statement: string): string[] {
  return statement.split(/\|&?/).map((stage) => stage.trim());
}

/** True when `command` pipes a check into tail/head/Select-Object. */
export function pipesCheckIntoFilter(command: string, toolName = 'Bash'): boolean {
  if (toolName === 'Bash' && PIPEFAIL_PATTERN.test(command)) return false;
  return splitStatements(command).some((statement) => {
    const stages = splitPipeline(statement);
    return stages.some(
      (stage, i) =>
        i > 0 &&
        FILTER_PATTERN.test(stage) &&
        stages.slice(0, i).some((earlier) => CHECK_PATTERN.test(earlier)),
    );
  });
}

interface HookInput {
  tool_name?: unknown;
  tool_input?: { command?: unknown };
}

/** Returns the block reason for a hook payload, or null to allow it. */
export function evaluateHookInput(raw: string): string | null {
  let input: HookInput;
  try {
    input = JSON.parse(raw) as HookInput;
  } catch {
    return null;
  }
  const command = input.tool_input?.command;
  if (typeof command !== 'string') return null;
  const toolName = typeof input.tool_name === 'string' ? input.tool_name : 'Bash';
  return pipesCheckIntoFilter(command, toolName) ? BLOCK_REASON : null;
}

async function main(): Promise<void> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  const reason = evaluateHookInput(Buffer.concat(chunks).toString('utf8'));
  if (reason !== null) {
    process.stderr.write(reason + '\n');
    process.exit(2);
  }
}

if (import.meta.main) await main();
