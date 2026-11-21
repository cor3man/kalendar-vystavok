// Browser-side assets for the PDF (SPEC 3.7): the bundled TTF files and PNG copies of the images.
import type { LayoutResult } from '../../layout/shapes.ts';
import boldUrl from '../fonts/PTSansNarrow-Bold.ttf?url';
import regularUrl from '../fonts/PTSansNarrow-Regular.ttf?url';
import type { PdfAssets } from './renderPdf.ts';

/**
 * Images that are not PNG (all seed flags are SVG) are rasterised at this multiple of their
 * pixel size: a 160 × 120 flag becomes 640 × 480, about 4 800 dpi at the printed 3.4 mm.
 */
const RASTER_SCALE = 4;

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

async function rasterise(dataUrl: string, width: number, height: number): Promise<string> {
  const img = new Image();
  img.src = dataUrl;
  await img.decode();
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width * RASTER_SCALE));
  canvas.height = Math.max(1, Math.round(height * RASTER_SCALE));
  const ctx = canvas.getContext('2d');
  if (ctx === null) throw new Error('Canvas 2D context is not available');
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/png');
}

const pngCache = new Map<string, Promise<string>>();

function toPng(dataUrl: string, width: number, height: number): Promise<string> {
  if (dataUrl.startsWith('data:image/png')) return Promise.resolve(dataUrl);
  let png = pngCache.get(dataUrl);
  if (png === undefined) {
    png = rasterise(dataUrl, width, height);
    pngCache.set(dataUrl, png);
    png.catch(() => pngCache.delete(dataUrl));
  }
  return png;
}

/** Fonts plus one PNG per distinct image of the layout. */
export async function loadPdfAssets(layout: LayoutResult): Promise<PdfAssets> {
  const sources = new Map<string, { width: number; height: number }>();
  for (const s of layout.shapes) if (s.kind === 'image') sources.set(s.image.dataUrl, s.image);
  const [fonts, pngs] = await Promise.all([
    loadFonts(),
    Promise.all(
      [...sources].map(async ([src, { width, height }]) => [src, await toPng(src, width, height)]),
    ),
  ]);
  return { fonts, images: new Map(pngs as [string, string][]) };
}
