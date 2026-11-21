// data + year + format → LayoutResult (SPEC 3, 6.3). Pure and deterministic.
import { ru } from '../i18n/ru.ts';
import { compareISO, daysInMonth, formatDMY, isValidISO, toISO, weekday } from '../domain/dates.ts';
import { layoutSegments, segmentDays, type Segment } from '../domain/segments.ts';
import type {
  Country,
  DataFile,
  Exhibition,
  FormatId,
  Id,
  ISODate,
  Warning,
} from '../domain/types.ts';
import { FONT_METRICS, type TextMeasurer } from './measure.ts';
import {
  COLORS,
  MARGIN,
  NEXT_YEAR_LABEL,
  ROWS,
  SIZES,
  pageGeometry,
  pageTitle,
  type PageGeometry,
} from './pageSpec.ts';
import type { EventHit, GridGeometry, LayoutResult, Rect, Shape, TextShape } from './shapes.ts';
import { fitSegment, sizeSteps } from './textFit.ts';

export interface LayoutInput {
  data: DataFile;
  year: number;
  format: FormatId;
  exportDate: ISODate;
  measurer: TextMeasurer;
}

function text(
  x: number,
  y: number,
  value: string,
  size: number,
  bold: boolean,
  color: string,
  align: TextShape['align'] = 'left',
): TextShape {
  return { kind: 'text', x, y, text: value, size, bold, color, rotate: 0, align };
}

/** Baseline that centres capitals vertically in [top, top + height]. */
function centredBaseline(top: number, height: number, size: number): number {
  return top + height / 2 + (FONT_METRICS.capHeight * size) / 2;
}

function cellRect(g: PageGeometry, column: number, day: number): Rect {
  return { x: g.grid.x + column * g.colW, y: g.grid.y + (day - 1) * g.rowH, w: g.colW, h: g.rowH };
}

/** Text area of a segment (3.6): lane minus the number zone (lane 0) and the insets. */
export function segmentTextArea(g: PageGeometry, s: Segment): Rect {
  const laneW = g.colW / s.laneCount;
  const laneX = g.grid.x + s.column * g.colW + s.lane * laneW;
  const left = laneX + (s.lane === 0 ? SIZES.numberZone : 0) + SIZES.textInsetLeft;
  const right = laneX + laneW - SIZES.textInsetRight;
  return {
    x: left,
    y: g.grid.y + (s.startDay - 1) * g.rowH,
    w: right - left,
    h: segmentDays(s) * g.rowH,
  };
}

export function segmentRect(g: PageGeometry, s: Segment): Rect {
  const laneW = g.colW / s.laneCount;
  return {
    x: g.grid.x + s.column * g.colW + s.lane * laneW,
    y: g.grid.y + (s.startDay - 1) * g.rowH,
    w: laneW,
    h: segmentDays(s) * g.rowH,
  };
}

function isDrawableEvent(e: { start: string; end: string }): boolean {
  return isValidISO(e.start) && isValidISO(e.end) && e.start <= e.end;
}

export function layoutCalendar(input: LayoutInput): LayoutResult {
  const { data, year, format, exportDate, measurer: m } = input;
  const g = pageGeometry(format, year);
  const { spec, months, grid } = g;
  const title = pageTitle(format, year);
  const shapes: Shape[] = [];

  const exhibitions = new Map<Id, Exhibition>(data.exhibitions.map((e) => [e.id, e]));
  const countries = new Map<Id, Country>(data.countries.map((c) => [c.id, c]));
  const holidays = new Map<ISODate, string>(data.holidays.map((h) => [h.date, h.label]));
  const events = data.events
    .filter(isDrawableEvent)
    .sort((a, b) => compareISO(a.start, b.start) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const eventById = new Map(events.map((e) => [e.id, e]));
  const { segments, clusters } = layoutSegments(events, months);

  const covered = new Set<string>();
  for (const s of segments)
    for (let d = s.startDay; d <= s.endDay; d++) covered.add(`${String(s.column)}:${String(d)}`);
  const isCovered = (column: number, day: number): boolean =>
    covered.has(`${String(column)}:${String(day)}`);

  // 1. Background year, below all fills (3.2).
  const bgYear = String(year);
  const bgSize = grid.w / 3 / m.width(bgYear, 1, true);
  shapes.push(
    text(grid.x + grid.w, grid.y + grid.h, bgYear, bgSize, true, COLORS.backgroundYear, 'right'),
  );

  // 2. Holiday fills (3.4); an event fill wins.
  months.forEach(({ year: y, month }, column) => {
    for (let day = 1; day <= daysInMonth(y, month); day++) {
      const label = holidays.get(toISO(y, month, day));
      if (label !== undefined && label !== '' && !isCovered(column, day)) {
        shapes.push({ kind: 'rect', ...cellRect(g, column, day), fill: COLORS.holidayFill });
      }
    }
  });

  // 3. Event fills (3.5).
  const hits: EventHit[] = [];
  for (const s of segments) {
    const r = segmentRect(g, s);
    shapes.push({
      kind: 'rect',
      ...r,
      fill: eventById.get(s.eventId)?.color ?? COLORS.holidayFill,
    });
    hits.push({ eventId: s.eventId, ...r });
  }

  // 4. Day numbers and weekdays (3.3); 5. holiday labels.
  months.forEach(({ year: y, month }, column) => {
    for (let day = 1; day <= daysInMonth(y, month); day++) {
      const iso = toISO(y, month, day);
      const cell = cellRect(g, column, day);
      const wd = weekday(iso);
      const label = holidays.get(iso);
      const color = wd >= 5 || label !== undefined ? COLORS.magenta : COLORS.text;
      const num = String(day);
      const baseline = centredBaseline(cell.y, cell.h, SIZES.dayNumber);
      const numX = cell.x + SIZES.dayTextLeft;
      shapes.push(text(numX, baseline, num, SIZES.dayNumber, false, color));
      const wdX = numX + m.width(num, SIZES.dayNumber, false) + SIZES.weekdayGap;
      shapes.push(text(wdX, baseline, ru.weekdaysShort[wd] ?? '', SIZES.weekday, false, color));

      if (label !== undefined && label !== '' && !isCovered(column, day)) {
        const left = cell.x + SIZES.numberZone + SIZES.textInsetLeft;
        const right = cell.x + cell.w - SIZES.textInsetRight;
        const steps = sizeSteps(SIZES.holidayLabelMax, SIZES.holidayLabelMin);
        const size =
          steps.find((s) => m.width(label, s, true) <= right - left) ?? SIZES.holidayLabelMin;
        shapes.push(
          text(
            right,
            centredBaseline(cell.y, cell.h, size),
            label,
            size,
            true,
            COLORS.holidayLabel,
            'right',
          ),
        );
      }
    }
  });

  // 6. Grid lines, above all fills (3.2).
  const lineStyle = { stroke: COLORS.gridLine, width: SIZES.gridLineWidth };
  for (let c = 0; c <= months.length; c++) {
    const x = grid.x + c * g.colW;
    shapes.push({ kind: 'line', x1: x, y1: grid.y, x2: x, y2: grid.y + grid.h, ...lineStyle });
  }
  for (let r = 0; r <= ROWS; r++) {
    const y = grid.y + r * g.rowH;
    shapes.push({ kind: 'line', x1: grid.x, y1: y, x2: grid.x + grid.w, y2: y, ...lineStyle });
  }

  // 7. Event content (3.6).
  const overflow = new Set<Id>();
  for (const s of segments) {
    const event = eventById.get(s.eventId);
    if (event === undefined) continue;
    const exhibition = exhibitions.get(event.exhibitionId);
    const country = event.countryId === null ? undefined : countries.get(event.countryId);
    const result = fitSegment(
      {
        area: segmentTextArea(g, s),
        name: exhibition?.shortName ?? '',
        held: event.held,
        primary: s.isPrimary
          ? { city: event.city.trim(), flag: country?.flag ?? null, logo: exhibition?.logo ?? null }
          : null,
        days: segmentDays(s),
        rowH: g.rowH,
      },
      m,
    );
    if (result.step === 'clipped') overflow.add(event.id);
    shapes.push(...result.shapes);
  }

  // 8. Month header band (3.2).
  shapes.push({ kind: 'rect', ...g.band, fill: COLORS.headerFill });
  months.forEach(({ month }, column) => {
    const name = (ru.months[month - 1] ?? '').toLocaleUpperCase('ru');
    shapes.push(
      text(
        g.band.x + (column + 0.5) * g.colW,
        centredBaseline(g.band.y, g.band.h, spec.monthNameSize),
        name,
        spec.monthNameSize,
        true,
        COLORS.headerText,
        'center',
      ),
    );
  });

  // 9. Title, export date and (split) the next-year label.
  shapes.push(text(MARGIN, g.titleBaseline, title, spec.titleSize, true, COLORS.magenta));
  shapes.push(
    text(
      spec.w - MARGIN,
      g.titleBaseline,
      `${ru.updatedPrefix} ${formatDMY(exportDate)}`,
      SIZES.updated,
      false,
      COLORS.updated,
      'right',
    ),
  );
  if (format === 'split') {
    const janColumn = months.findIndex((mo) => mo.month === 1);
    shapes.push(
      text(
        g.band.x + (janColumn + 0.5) * g.colW,
        g.band.y - NEXT_YEAR_LABEL.gapAboveBand,
        String(year + 1),
        NEXT_YEAR_LABEL.size,
        true,
        COLORS.magenta,
        'center',
      ),
    );
  }

  // Warnings (5.7).
  const warnings: Warning[] = [];
  const visibleYears = [...new Set(months.map((mo) => mo.year))];
  for (const y of visibleYears) {
    if (!data.holidays.some((h) => h.date.startsWith(`${String(y)}-`)))
      warnings.push({ kind: 'noHolidays', year: y });
  }
  for (const c of clusters)
    if (c.laneCount >= 3) warnings.push({ kind: 'tripleOverlap', eventIds: c.eventIds });
  const visibleEventIds = [...new Set(segments.map((s) => s.eventId))];
  const ordered = events.filter((e) => visibleEventIds.includes(e.id));
  for (const e of ordered) {
    if (e.countryId !== null && (countries.get(e.countryId)?.flag ?? null) === null) {
      warnings.push({ kind: 'missingFlag', eventId: e.id });
    }
  }
  for (const e of ordered)
    if (overflow.has(e.id)) warnings.push({ kind: 'textOverflow', eventId: e.id });

  const gridGeometry: GridGeometry = {
    x: grid.x,
    y: grid.y,
    colW: g.colW,
    rowH: g.rowH,
    rows: ROWS,
    months,
  };
  return {
    page: { w: spec.w, h: spec.h, formatId: format, title },
    shapes,
    grid: gridGeometry,
    hits,
    warnings,
  };
}

/** The day under a point of the page, or null outside the grid or on a non-existing day. */
export function dayAt(grid: GridGeometry, x: number, y: number): ISODate | null {
  const column = Math.floor((x - grid.x) / grid.colW);
  const row = Math.floor((y - grid.y) / grid.rowH);
  const mo = grid.months[column];
  if (mo === undefined || row < 0 || row >= grid.rows) return null;
  const day = row + 1;
  return day <= daysInMonth(mo.year, mo.month) ? toISO(mo.year, mo.month, day) : null;
}
