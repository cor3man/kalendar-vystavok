// Size rules for imported logos and flags (SPEC 4.1). No DOM, so it is unit-tested in Node.

export interface SizeLimit {
  maxW: number;
  maxH: number;
}

export const LOGO_LIMIT: SizeLimit = { maxW: 600, maxH: 300 };
export const FLAG_LIMIT: SizeLimit = { maxW: 160, maxH: 120 };
export const MAX_IMAGE_BYTES = 200 * 1024;

/** Size that fits inside the limit with the aspect kept; never enlarged. */
export function fitSize(w: number, h: number, limit: SizeLimit): { width: number; height: number } {
  const scale = Math.min(1, limit.maxW / w, limit.maxH / h);
  return {
    width: Math.max(1, Math.round(w * scale)),
    height: Math.max(1, Math.round(h * scale)),
  };
}

/** Decoded size of a base64 data URL in bytes. */
export function dataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return Math.floor((base64.length * 3) / 4) - padding;
}
