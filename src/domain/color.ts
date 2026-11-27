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

// Custom colour sliders (SPEC 5.4, Appendix C): CIE LCh(ab), D65, chroma reduced into sRGB.

/** Slider bounds; the lower lightness limit is the grid's (Appendix C). */
export const CUSTOM_HUE_MAX = 359;
export const CUSTOM_LIGHTNESS_MIN = 63;
export const CUSTOM_LIGHTNESS_MAX = 95;
export const CUSTOM_CHROMA = 30;

const WHITE = { x: 0.95047, y: 1, z: 1.08883 };
const EPS = 6 / 29;

function labF(t: number): number {
  return t > EPS ** 3 ? Math.cbrt(t) : t / (3 * EPS * EPS) + 4 / 29;
}

function labFInv(t: number): number {
  return t > EPS ? t ** 3 : 3 * EPS * EPS * (t - 4 / 29);
}

function encode(c: number): number {
  return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
}

/** Gamma-encoded sRGB channels 0–1 (may fall outside 0–1 when out of gamut). */
function lchToRgb(l: number, c: number, hue: number): [number, number, number] {
  const h = (hue * Math.PI) / 180;
  const fy = (l + 16) / 116;
  const fx = fy + (c * Math.cos(h)) / 500;
  const fz = fy - (c * Math.sin(h)) / 200;
  const x = WHITE.x * labFInv(fx);
  const y = WHITE.y * labFInv(fy);
  const z = WHITE.z * labFInv(fz);
  const r = 3.2404542 * x - 1.5371385 * y - 0.4985314 * z;
  const g = -0.969266 * x + 1.8760108 * y + 0.041556 * z;
  const b = 0.0556434 * x - 0.2040259 * y + 1.0572252 * z;
  return [encode(r), encode(g), encode(b)];
}

function inGamut(rgb: readonly number[]): boolean {
  return rgb.every((v) => v >= 0 && v <= 1);
}

function toHex(rgb: readonly number[]): string {
  const part = (v: number) =>
    Math.round(Math.min(1, Math.max(0, v)) * 255)
      .toString(16)
      .padStart(2, '0');
  return `#${rgb.map(part).join('')}`.toUpperCase();
}

/** Lightens a hex colour one step per channel until its L* reaches `min`. */
function atLeastLightness(hex: string, min: number): string {
  let current = hex;
  while (lightness(current) < min) {
    const m = HEX_RE.exec(current);
    if (m === null) return current;
    const next = [m[1], m[2], m[3]].map((h) => Math.min(255, parseInt(h ?? '0', 16) + 1) / 255);
    current = toHex(next);
  }
  return current;
}

/** Hex colour of a slider position: chroma CUSTOM_CHROMA reduced as far as sRGB needs. */
export function customColor(hue: number, l: number): string {
  const light = Math.min(CUSTOM_LIGHTNESS_MAX, Math.max(CUSTOM_LIGHTNESS_MIN, l));
  let chroma = CUSTOM_CHROMA;
  if (!inGamut(lchToRgb(light, chroma, hue))) {
    let lo = 0;
    let hi = CUSTOM_CHROMA;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (inGamut(lchToRgb(light, mid, hue))) lo = mid;
      else hi = mid;
    }
    chroma = lo;
  }
  return atLeastLightness(toHex(lchToRgb(light, chroma, hue)), CUSTOM_LIGHTNESS_MIN);
}

function decode(channel: number): number {
  const c = channel / 255;
  return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** Nearest slider position of any hex colour: hue 0–359, lightness clamped to the slider range. */
export function sliderPosition(hex: string): { hue: number; l: number } {
  const m = HEX_RE.exec(hex);
  if (m === null) throw new RangeError(`Invalid colour: ${hex}`);
  const [r = 0, g = 0, b = 0] = [m[1], m[2], m[3]].map((h) => decode(parseInt(h ?? '0', 16)));
  const x = 0.4124564 * r + 0.3575761 * g + 0.1804375 * b;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = 0.0193339 * r + 0.119192 * g + 0.9503041 * b;
  const fx = labF(x / WHITE.x);
  const fy = labF(y / WHITE.y);
  const fz = labF(z / WHITE.z);
  const l = 116 * fy - 16;
  const hue =
    Math.round(((Math.atan2(200 * (fy - fz), 500 * (fx - fy)) * 180) / Math.PI + 360) % 360) % 360;
  const clamped = Math.round(Math.min(CUSTOM_LIGHTNESS_MAX, Math.max(CUSTOM_LIGHTNESS_MIN, l)));
  return { hue, l: clamped };
}
