// Image upload for logos and flags (SPEC 4.1): resized on import, max 200 KB each.
// PNG and JPG are redrawn as PNG within the size limit; SVG stays vector.
import type { ImageData } from '../../domain/types.ts';
import { dataUrlBytes, fitSize, MAX_IMAGE_BYTES, type SizeLimit } from './imageSize.ts';

export { FLAG_LIMIT, LOGO_LIMIT, type SizeLimit } from './imageSize.ts';

/** Accepted by the file inputs (SPEC 5.5: PNG, JPG or SVG). */
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/svg+xml,.png,.jpg,.jpeg,.svg';

export type ImageImportResult =
  { ok: true; image: ImageData } | { ok: false; error: 'tooLarge' | 'unreadable' };

function isSvg(file: File): boolean {
  return file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

/** Width and height of an SVG from its viewBox, for files without a pixel size. */
function svgViewBoxSize(text: string): { w: number; h: number } | null {
  const m = /viewBox\s*=\s*["']\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)/i.exec(text);
  const w = Number(m?.[1]);
  const h = Number(m?.[2]);
  return w > 0 && h > 0 ? { w, h } : null;
}

async function importSvg(file: File, limit: SizeLimit): Promise<ImageImportResult> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.length > MAX_IMAGE_BYTES) return { ok: false, error: 'tooLarge' };
  const dataUrl = `data:image/svg+xml;base64,${toBase64(bytes)}`;
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  // The viewBox gives the true aspect; Chrome reports 300 × 150 for an SVG without width / height.
  const box =
    svgViewBoxSize(new TextDecoder().decode(bytes)) ??
    (img.naturalWidth > 0 && img.naturalHeight > 0
      ? { w: img.naturalWidth, h: img.naturalHeight }
      : null);
  if (box === null) return { ok: false, error: 'unreadable' };
  return { ok: true, image: { dataUrl, ...fitSize(box.w, box.h, limit) } };
}

async function importRaster(file: File, limit: SizeLimit): Promise<ImageImportResult> {
  const bitmap = await createImageBitmap(file);
  const size = fitSize(bitmap.width, bitmap.height, limit);
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) return { ok: false, error: 'unreadable' };
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(bitmap, 0, 0, size.width, size.height);
  bitmap.close();
  const dataUrl = canvas.toDataURL('image/png');
  if (dataUrlBytes(dataUrl) > MAX_IMAGE_BYTES) return { ok: false, error: 'tooLarge' };
  return { ok: true, image: { dataUrl, ...size } };
}

export async function importImage(file: File, limit: SizeLimit): Promise<ImageImportResult> {
  try {
    return await (isSvg(file) ? importSvg(file, limit) : importRaster(file, limit));
  } catch {
    return { ok: false, error: 'unreadable' };
  }
}
