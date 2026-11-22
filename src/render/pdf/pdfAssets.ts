// Browser-side assets for the PDF (SPEC 3.7): the bundled TTF files and PNG copies of the images.
import type { LayoutResult } from '../../layout/shapes.ts';
import boldUrl from '../fonts/PTSansNarrow-Bold.ttf?url';
import regularUrl from '../fonts/PTSansNarrow-Regular.ttf?url';
import { imageNeeds, targetPixels, type PixelSize } from './imageSize.ts';
import type { PdfAssets } from './renderPdf.ts';

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunk = 0x8000;
  let binary = '';
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function fetchBase64(url: string): Promise<string> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Font request failed: ${String(response.status)} ${url}`);
  return toBase64(await response.arrayBuffer());
}

let fontsPromise: Promise<PdfAssets['fonts']> | null = null;

/** Same-origin font files of the app itself (no external requests, SPEC 7.1); loaded once. */
function loadFonts(): Promise<PdfAssets['fonts']> {
  fontsPromise ??= Promise.all([fetchBase64(regularUrl), fetchBase64(boldUrl)]).then(
    ([regular, bold]) => ({ regular, bold }),
    (error: unknown) => {
      fontsPromise = null; // allow a retry on the next export
      throw error;
    },
  );
  return fontsPromise;
}

/** Draws the image at `size` pixels and returns it as a PNG data URL. */
async function rasterise(dataUrl: string, size: PixelSize): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D context is not available');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

const pngCache = new Map<string, Promise<string>>();

/** PNG for one image at the pixel size it is printed at (see imageSize.ts). */
function toPng(dataUrl: string, target: PixelSize | null): Promise<string> {
  if (target === null) return Promise.resolve(dataUrl);
  const key = `${String(target.width)}x${String(target.height)} ${dataUrl}`;
  let png = pngCache.get(key);
  if (png === undefined) {
    png = rasterise(dataUrl, target);
    pngCache.set(key, png);
    png.catch(() => pngCache.delete(key));
  }
  return png;
}

/** Fonts plus one PNG per distinct image of the layout. */
export async function loadPdfAssets(layout: LayoutResult): Promise<PdfAssets> {
  const [fonts, pngs] = await Promise.all([
    loadFonts(),
    Promise.all(
      [...imageNeeds(layout)].map(async ([src, need]) => {
        // Non-PNG sources (all seed flags are SVG) are always rasterised.
        const isPng = src.startsWith('data:image/png');
        const target = targetPixels(need, !isPng);
        return [src, await toPng(src, target)] as const;
      }),
    ),
  ]);
  return { fonts, images: new Map(pngs) };
}
