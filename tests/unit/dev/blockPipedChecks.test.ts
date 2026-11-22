import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import {
  BLOCK_REASON,
  evaluateHookInput,
  pipesCheckIntoFilter,
} from '../../../.claude/hooks/blockPipedChecks.ts';

const HOOK_PATH = fileURLToPath(
  new URL('../../../.claude/hooks/blockPipedChecks.ts', import.meta.url),
);

describe('pipesCheckIntoFilter', () => {
  it.each([
    'npm run check | tail',
    'npm test | head',
    'npm run lint | Select-Object -Last 20',
    'npm run check 2>&1 | tail -n 40',
    'npm run typecheck |& tail',
    'cd app && npm run test:e2e | head -5',
    'npx vitest run | tail -20',
    'npm run format:check | grep x | tail',
    'npm run lint | select -First 5',
  ])('blocks %j', (command) => {
    expect(pipesCheckIntoFilter(command)).toBe(true);
  });

  it.each([
    'npm run check',
    'npm test',
    'npm run lint 2>&1',
    'git log | head -5',
    'npm run check || echo failed',
    'npm run check; git status | tail',
    'npm run dev | Out-File log.txt',
    'cat CHANGELOG.md | head',
  ])('allows %j', (command) => {
    expect(pipesCheckIntoFilter(command)).toBe(false);
  });

  it('allows bash pipes under pipefail, as CLAUDE.md permits', () => {
    expect(pipesCheckIntoFilter('set -o pipefail; npm run check | tail', 'Bash')).toBe(false);
    expect(pipesCheckIntoFilter('set -euo pipefail; npm test | tail', 'Bash')).toBe(false);
  });

  it('ignores pipefail for PowerShell, which has no such option', () => {
    expect(pipesCheckIntoFilter('set -o pipefail; npm run check | tail', 'PowerShell')).toBe(true);
  });
});

describe('evaluateHookInput', () => {
  const payload = (tool_name: string, command: unknown) =>
    JSON.stringify({ tool_name, tool_input: { command } });

  it('returns the reason for a blocked command', () => {
    expect(evaluateHookInput(payload('PowerShell', 'npm test | Select-Object -Last 5'))).toBe(
      BLOCK_REASON,
    );
  });

  it('returns null for an allowed command, a missing command or bad JSON', () => {
    expect(evaluateHookInput(payload('Bash', 'npm run check'))).toBeNull();
    expect(evaluateHookInput(payload('Bash', undefined))).toBeNull();
    expect(evaluateHookInput('not json')).toBeNull();
  });
});

describe('hook process', () => {
  const run = (command: string) =>
    spawnSync(process.execPath, [HOOK_PATH], {
      input: JSON.stringify({ tool_name: 'Bash', tool_input: { command } }),
      encoding: 'utf8',
    });

  it('exits 2 with the reason on stderr for a blocked command', () => {
    const result = run('npm run check | tail');
    expect(result.status).toBe(2);
    expect(result.stderr.trim()).toBe(BLOCK_REASON);
  });

  it('exits 0 silently for an allowed command', () => {
    const result = run('npm run check');
    expect(result.status).toBe(0);
    expect(result.stderr).toBe('');
  });
});
