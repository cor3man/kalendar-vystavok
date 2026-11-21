// LayoutResult → SVG preview. Draws shapes only; never computes layout (CLAUDE.md).
import type { ReactElement } from 'react';
import { FONT_FAMILY } from '../../layout/measure.ts';
import { COLORS, SIZES } from '../../layout/pageSpec.ts';
import type { LayoutResult, Shape, TextShape } from '../../layout/shapes.ts';

const ANCHOR: Record<TextShape['align'], 'start' | 'end' | 'middle'> = {
  left: 'start',
  right: 'end',
  center: 'middle',
};

function drawShape(shape: Shape, key: number, clipId: string): ReactElement {
  switch (shape.kind) {
    case 'rect':
      return (
        <rect
          key={key}
          x={shape.x}
          y={shape.y}
          width={shape.w}
          height={shape.h}
          fill={shape.fill}
        />
      );
    case 'line':
      return (
        <line
          key={key}
          x1={shape.x1}
          y1={shape.y1}
          x2={shape.x2}
          y2={shape.y2}
          stroke={shape.stroke}
          strokeWidth={shape.width}
        />
      );
    case 'image':
      return (
        <g key={key}>
          <image
            href={shape.image.dataUrl}
            x={shape.x}
            y={shape.y}
            width={shape.w}
            height={shape.h}
            preserveAspectRatio="none"
          />
          {shape.border && (
            <rect
              x={shape.x}
              y={shape.y}
              width={shape.w}
              height={shape.h}
              fill="none"
              stroke={COLORS.flagBorder}
              strokeWidth={SIZES.flagBorderWidth}
            />
          )}
        </g>
      );
    case 'text':
      return (
        <text
          key={key}
          x={shape.x}
          y={shape.y}
          fontSize={shape.size}
          fontWeight={shape.bold ? 700 : 400}
          fill={shape.color}
          textAnchor={ANCHOR[shape.align]}
          transform={
            shape.rotate === 90 ? `rotate(-90 ${String(shape.x)} ${String(shape.y)})` : undefined
          }
          clipPath={shape.clip === undefined ? undefined : `url(#${clipId})`}
          xmlSpace="preserve"
        >
          {shape.text}
        </text>
      );
  }
}

interface CalendarSvgProps {
  layout: LayoutResult;
  title: string;
}

export function CalendarSvg({ layout, title }: CalendarSvgProps) {
  const { page, shapes } = layout;
  const clipId = (i: number): string => `clip-${String(i)}`;
  return (
    <svg
      viewBox={`0 0 ${String(page.w)} ${String(page.h)}`}
      width="100%"
      role="img"
      aria-label={title}
      fontFamily={`'${FONT_FAMILY}', sans-serif`}
      data-format={page.formatId}
    >
      <defs>
        {shapes.map((s, i) =>
          s.kind === 'text' && s.clip !== undefined ? (
            // A rotated text's clip is given in page coordinates, so the clip path ignores the text's transform.
            <clipPath key={i} id={clipId(i)} clipPathUnits="userSpaceOnUse">
              <rect
                x={s.clip.x}
                y={s.clip.y}
                width={s.clip.w}
                height={s.clip.h}
                transform={s.rotate === 90 ? `rotate(90 ${String(s.x)} ${String(s.y)})` : undefined}
              />
            </clipPath>
          ) : null,
        )}
      </defs>
      <rect x={0} y={0} width={page.w} height={page.h} fill="#FFFFFF" />
      {shapes.map((s, i) => drawShape(s, i, clipId(i)))}
    </svg>
  );
}
