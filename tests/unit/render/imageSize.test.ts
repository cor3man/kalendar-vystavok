import { describe, expect, it } from 'vitest';
import type { ImageData } from '../../../src/domain/types.ts';
import type { LayoutResult, Shape } from '../../../src/layout/shapes.ts';
import { imageNeeds, PRINT_DPI, targetPixels } from '../../../src/render/pdf/imageSize.ts';

const flag: ImageData = { dataUrl: 'data:image/svg+xml;base64,AAA', width: 160, height: 120 };
const logo: ImageData = { dataUrl: 'data:image/png;base64,BBB', width: 600, height: 300 };

function image(img: ImageData, w: number, h: number): Shape {
  return { kind: 'image', x: 0, y: 0, w, h, image: img, border: false };
}

function layout(shapes: Shape[]): LayoutResult {
  return { shapes } as unknown as LayoutResult;
}

/** Pixels for `mm` millimetres at PRINT_DPI, rounded up. */
const px = (mm: number) => Math.ceil((mm / 25.4) * PRINT_DPI);

describe('imageNeeds', () => {
  it('keeps the largest drawn size of each distinct image', () => {
    const needs = imageNeeds(
      layout([
        image(flag, 4, 3),
        { kind: 'rect', x: 0, y: 0, w: 1, h: 1, fill: '#000000' },
        image(flag, 4.5, 3.4),
        image(logo, 10, 5),
      ]),
    );
    expect(needs.size).toBe(2);
    expect(needs.get(flag.dataUrl)).toEqual({
      source: { width: 160, height: 120 },
      w: 4.5,
      h: 3.4,
    });
    expect(needs.get(logo.dataUrl)?.w).toBe(10);
  });
});

describe('targetPixels', () => {
  it('rasterises a vector flag at its printed size at 600 dpi', () => {
    const t = targetPixels({ source: { width: 160, height: 120 }, w: 4.5, h: 3.4 }, true);
    // 3.4 mm at 600 dpi: 81 px, far fewer than the old 4× raster (480 px).
    expect(t).toEqual({ width: px(4.5), height: 81 });
  });

  it('shrinks a raster logo that is printed smaller than its pixels allow', () => {
    // Needs 237 × 119 px; the height needs the larger share (119 / 300), aspect ratio kept.
    const t = targetPixels({ source: { width: 600, height: 300 }, w: 10, h: 5 }, false);
    expect(t).toEqual({ width: 238, height: 119 });
  });

  it('never enlarges a raster image', () => {
    expect(targetPixels({ source: { width: 120, height: 60 }, w: 30, h: 15 }, false)).toBeNull();
  });

  it('keeps enough pixels for the larger of both directions', () => {
    // Drawn squashed: the width needs more pixels than the height.
    const t = targetPixels({ source: { width: 1000, height: 1000 }, w: 20, h: 5 }, false);
    expect(t).toEqual({ width: px(20), height: px(20) });
  });

  it('never returns zero pixels', () => {
    expect(targetPixels({ source: { width: 10, height: 10 }, w: 0.001, h: 0.001 }, true)).toEqual({
      width: 1,
      height: 1,
    });
  });
});
