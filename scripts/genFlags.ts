// Generates src/storage/seedFlags.json from the flag-icons package (MIT), SPEC Appendix A.
// Run: node scripts/genFlags.ts
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** ISO 3166 codes of the 30 preloaded countries, in seed order. */
const CODES = [
  'ru',
  'by',
  'kz',
  'uz',
  'az',
  'cn',
  'de',
  'tr',
  'ae',
  'kg',
  'am',
  'ge',
  'tj',
  'tm',
  'pl',
  'lt',
  'lv',
  'it',
  'fr',
  'es',
  'nl',
  'in',
  'ir',
  'rs',
  'eg',
  'vn',
  'us',
  'gb',
  'mn',
  'sa',
];

/** SPEC 4.1: flags are max 160 × 120 px and 200 KB. */
const WIDTH = 160;
const HEIGHT = 120;
const MAX_BYTES = 200 * 1024;

/** Collapses whitespace and rounds coordinates to `decimals` places (0 or 1). */
function minify(svg: string, decimals: 0 | 1): string {
  const round = decimals === 1 ? /(\d+\.\d)\d+/g : /(\d+)\.\d+/g;
  return svg
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/>\s+</g, '><')
    .replace(/\s{2,}/g, ' ')
    .replace(round, '$1')
    .trim();
}

const root = fileURLToPath(new URL('..', import.meta.url));
const out: Record<string, { dataUrl: string; width: number; height: number }> = {};
for (const code of CODES) {
  const source = readFileSync(`${root}node_modules/flag-icons/flags/4x3/${code}.svg`, 'utf8');
  const encode = (svg: string): string =>
    `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
  let dataUrl = encode(minify(source, 1));
  // Very detailed flags (e.g. Serbia's coat of arms) are rounded to whole units of the 640×480 viewBox.
  if (dataUrl.length > MAX_BYTES) dataUrl = encode(minify(source, 0));
  if (dataUrl.length > MAX_BYTES)
    throw new Error(`Flag ${code} is ${String(dataUrl.length)} bytes`);
  out[code] = { dataUrl, width: WIDTH, height: HEIGHT };
}
writeFileSync(`${root}src/storage/seedFlags.json`, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${String(CODES.length)} flags`);
