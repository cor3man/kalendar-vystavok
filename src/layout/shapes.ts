// Layout output (SPEC 6.3): everything in mm, origin top-left.
import type { FormatId, Id, ImageData, Warning } from '../domain/types.ts';
import type { MonthRef } from '../domain/segments.ts';

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RectShape extends Rect {
  kind: 'rect';
  fill: string;
}

export interface LineShape {
  kind: 'line';
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  stroke: string;
  width: number;
}

/**
 * Text drawn at an anchor point. (x, y) is on the baseline; `align` says which end of the text
 * the anchor is. `rotate: 90` turns the text 90° counter-clockwise around the anchor, so it reads
 * bottom to top and 'right' means the anchor is the top end.
 * `clip` (extension of SPEC 6.3, used by fallback step 4 of 3.6) limits drawing to a rectangle.
 */
export interface TextShape {
  kind: 'text';
  x: number;
  y: number;
  text: string;
  size: number;
  bold: boolean;
  color: string;
  rotate: 0 | 90;
  align: 'left' | 'right' | 'center';
  clip?: Rect;
}

export interface ImageShape extends Rect {
  kind: 'image';
  image: ImageData;
  border: boolean;
}

/**
 * Open polyline in page coordinates, stroked with round caps and joins; used for the held
 * check mark (SPEC 3.6). `clip` as on text shapes.
 */
export interface PathShape {
  kind: 'path';
  points: { x: number; y: number }[];
  stroke: string;
  width: number;
  clip?: Rect;
}

export type Shape = RectShape | LineShape | TextShape | ImageShape | PathShape;

/** Geometry of the day grid, for hit-testing day cells. */
export interface GridGeometry {
  x: number;
  y: number;
  colW: number;
  rowH: number;
  rows: 31;
  months: MonthRef[];
}

export interface EventHit extends Rect {
  eventId: Id;
}

export interface LayoutResult {
  page: { w: number; h: number; formatId: FormatId; title: string };
  /** In drawing order. */
  shapes: Shape[];
  grid: GridGeometry;
  hits: EventHit[];
  warnings: Warning[];
}
