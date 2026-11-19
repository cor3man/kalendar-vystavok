import { describe, expect, it } from 'vitest';
import { formatVersion } from '../../src/appInfo.ts';

describe('formatVersion', () => {
  it('prefixes the semantic version with "v"', () => {
    expect(formatVersion('0.1.0')).toBe('v0.1.0');
  });
});
