import { describe, expect, it } from 'vitest';
import { dataUrlBytes, FLAG_LIMIT, fitSize, LOGO_LIMIT } from '../../../src/ui/common/imageSize.ts';

describe('image import sizes (SPEC 4.1)', () => {
  it('fits logos in 600 × 300 and flags in 160 × 120, keeping the aspect', () => {
    expect(fitSize(1200, 300, LOGO_LIMIT)).toEqual({ width: 600, height: 150 });
    expect(fitSize(300, 600, LOGO_LIMIT)).toEqual({ width: 150, height: 300 });
    expect(fitSize(640, 480, FLAG_LIMIT)).toEqual({ width: 160, height: 120 });
    expect(fitSize(3, 2, FLAG_LIMIT)).toEqual({ width: 3, height: 2 });
    expect(fitSize(10000, 1, FLAG_LIMIT)).toEqual({ width: 160, height: 1 });
  });

  it('measures the decoded size of a base64 data URL', () => {
    expect(dataUrlBytes(`data:image/png;base64,${btoa('abc')}`)).toBe(3);
    expect(dataUrlBytes(`data:image/png;base64,${btoa('abcd')}`)).toBe(4);
    expect(dataUrlBytes(`data:image/png;base64,${btoa('abcde')}`)).toBe(5);
  });
});
