// Colour helpers for the event dialog (SPEC Appendix C).

/** A custom colour below this CIE lightness L* (0–100) gets a contrast warning (approved M4). */
export const DARK_LIGHTNESS = 45;

const HEX_RE = /^#([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})([0-9A-Fa-f]{2})$/;

export function isHexColor(value: string): boolean {
  return HEX_RE.test(value);
}

/** '#RRGGBB' in upper case, or null when the value is not a 6-digit hex colour. */
export function normalizeHex(value: string): string | null {
  return isHexColor(value) ? value.toUpperCase() : null;
}

function linear(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance, 0–1. */
export function relativeLuminance(hex: string): number {
  const m = HEX_RE.exec(hex);
  if (m === null) throw new RangeError(`Invalid colour: ${hex}`);
  const [r, g, b] = [m[1], m[2], m[3]].map((h) => linear(parseInt(h ?? '0', 16)));
  return 0.2126 * (r ?? 0) + 0.7152 * (g ?? 0) + 0.0722 * (b ?? 0);
}

/** CIE L* (perceptual lightness), 0–100. */
export function lightness(hex: string): number {
  const y = relativeLuminance(hex);
  return y <= 216 / 24389 ? (y * 24389) / 27 : 116 * Math.cbrt(y) - 16;
}

/** True when the dark event text (#151515) would be hard to read on this fill. */
export function isDarkColor(hex: string): boolean {
  return lightness(hex) < DARK_LIGHTNESS;
}
