// Fixed event palette (SPEC Appendix C). Display names live in ru.palette.

export const PALETTE = [
  { id: 'lilac', hex: '#B3A7E0' },
  { id: 'lightLilac', hex: '#E4DFF6' },
  { id: 'lightBlue', hex: '#CFE8F5' },
  { id: 'grey', hex: '#D2D2D2' },
  { id: 'darkGrey', hex: '#9C9C9C' },
  { id: 'pink', hex: '#F6CBD6' },
  { id: 'green', hex: '#CDE8C8' },
  { id: 'yellow', hex: '#F7E8A4' },
  { id: 'orange', hex: '#F8D2A6' },
  { id: 'turquoise', hex: '#BFE6E0' },
] as const;

export type PaletteId = (typeof PALETTE)[number]['id'];

export function isPaletteId(id: string): id is PaletteId {
  return PALETTE.some((p) => p.id === id);
}

export function paletteHex(id: PaletteId): string {
  const entry = PALETTE.find((p) => p.id === id);
  // PaletteId is derived from PALETTE, so the entry always exists.
  return entry?.hex ?? PALETTE[0].hex;
}
