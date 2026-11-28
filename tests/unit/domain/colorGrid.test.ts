import { describe, expect, it } from 'vitest';
import {
  CUSTOM_LIGHTNESS_MAX,
  CUSTOM_LIGHTNESS_MIN,
  customColor,
  isHexColor,
  lightness,
  sliderPosition,
} from '../../../src/domain/color.ts';
import { COLOR_HUES, GRID_CELLS, gridCellOf } from '../../../src/domain/colorGrid.ts';
import { PALETTE } from '../../../src/domain/palette.ts';

describe('colour grid (SPEC 5.4, Appendix C)', () => {
  it('has 10 hues × 4 tints of distinct valid colours', () => {
    expect(COLOR_HUES).toHaveLength(10);
    expect(GRID_CELLS).toHaveLength(40);
    expect(new Set(GRID_CELLS.map((c) => c.hex)).size).toBe(40);
    for (const c of GRID_CELLS) expect(isHexColor(c.hex)).toBe(true);
  });

  it('keeps every cell at L* 63 or lighter', () => {
    for (const c of GRID_CELLS) expect(lightness(c.hex)).toBeGreaterThanOrEqual(63);
  });

  it('gets lighter from tint 4 to tint 1 in every hue', () => {
    for (const hue of COLOR_HUES) {
      const l = GRID_CELLS.filter((c) => c.hue === hue).map((c) => lightness(c.hex));
      expect([...l].sort((a, b) => b - a)).toEqual(l);
    }
  });

  it('contains all ten named colours of v1.1', () => {
    for (const p of PALETTE) expect(gridCellOf(p.hex)).not.toBeNull();
    expect(gridCellOf('#b3a7e0')).toEqual({ hue: 'lilac', tint: 4, hex: '#B3A7E0' });
    expect(gridCellOf('#123456')).toBeNull();
  });

  it('lists cells row by row', () => {
    expect(GRID_CELLS[0]).toMatchObject({ hue: 'grey', tint: 1 });
    expect(GRID_CELLS[10]).toMatchObject({ hue: 'grey', tint: 2 });
  });
});

describe('custom colour sliders (SPEC 5.4, Appendix C)', () => {
  it('always gives a valid hex at L* 63 or lighter', () => {
    for (let hue = 0; hue <= 359; hue += 7) {
      for (let l = CUSTOM_LIGHTNESS_MIN; l <= CUSTOM_LIGHTNESS_MAX; l += 4) {
        const hex = customColor(hue, l);
        expect(isHexColor(hex)).toBe(true);
        expect(lightness(hex)).toBeGreaterThanOrEqual(CUSTOM_LIGHTNESS_MIN);
      }
    }
  });

  it('clamps the lightness into the slider range', () => {
    expect(lightness(customColor(30, 10))).toBeGreaterThanOrEqual(CUSTOM_LIGHTNESS_MIN);
    expect(customColor(30, 120)).toBe(customColor(30, CUSTOM_LIGHTNESS_MAX));
  });

  it('follows the lightness slider', () => {
    expect(lightness(customColor(200, 90))).toBeCloseTo(90, 0);
    expect(lightness(customColor(200, 70))).toBeCloseTo(70, 0);
  });

  it('round-trips through sliderPosition', () => {
    const hex = customColor(250, 80);
    const pos = sliderPosition(hex);
    expect(pos.l).toBe(80);
    expect(Math.abs(pos.hue - 250)).toBeLessThanOrEqual(2);
  });

  it('clamps a dark colour to the lowest slider lightness', () => {
    expect(sliderPosition('#202020').l).toBe(CUSTOM_LIGHTNESS_MIN);
    expect(sliderPosition('#FFFFFF').l).toBe(CUSTOM_LIGHTNESS_MAX);
  });
});
