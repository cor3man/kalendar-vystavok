// Colour grid of the picker (SPEC 5.4, Appendix C): 10 hues × 4 tints, tint 1 the lightest.
// All ten named colours of v1.1 (palette.ts) are cells of this grid.

export const COLOR_HUES = [
  'grey',
  'red',
  'orange',
  'yellow',
  'green',
  'turquoise',
  'blue',
  'lilac',
  'violet',
  'pink',
] as const;

export type ColorHue = (typeof COLOR_HUES)[number];

/** Tints per hue; index 0 = tint 1 (top row). */
export const COLOR_GRID: Readonly<Record<ColorHue, readonly [string, string, string, string]>> = {
  grey: ['#EFEFEF', '#D2D2D2', '#B8B8B8', '#9C9C9C'],
  red: ['#FADDD8', '#F5BCB2', '#EF9A8C', '#E87967'],
  orange: ['#FCE8D2', '#F8D2A6', '#F4BA7A', '#EFA152'],
  yellow: ['#FBF3D1', '#F7E8A4', '#F2DB76', '#EBCB4A'],
  green: ['#E6F4E3', '#CDE8C8', '#B0D9A9', '#92C98A'],
  turquoise: ['#DFF2EF', '#BFE6E0', '#9ED8CF', '#7BC9BD'],
  blue: ['#E7F4FA', '#CFE8F5', '#B2D8EE', '#93C5E6'],
  lilac: ['#F1EEFB', '#E4DFF6', '#CCC3EB', '#B3A7E0'],
  violet: ['#F2E3F5', '#E5C8EB', '#D6ABDF', '#C78ED3'],
  pink: ['#FBE5EB', '#F6CBD6', '#EFADBF', '#E68FA8'],
};

export const TINT_COUNT = 4;

export interface GridCell {
  hue: ColorHue;
  /** 1–4, 1 = lightest. */
  tint: number;
  hex: string;
}

/** Cells in reading order of the picker: row by row (tint), left to right (hue). */
export const GRID_CELLS: readonly GridCell[] = Array.from({ length: TINT_COUNT }, (_, t) =>
  COLOR_HUES.map((hue) => ({ hue, tint: t + 1, hex: COLOR_GRID[hue][t] ?? '' })),
).flat();

/** The grid cell with this colour, or null. Case-insensitive. */
export function gridCellOf(hex: string): GridCell | null {
  const color = hex.toUpperCase();
  return GRID_CELLS.find((c) => c.hex === color) ?? null;
}
