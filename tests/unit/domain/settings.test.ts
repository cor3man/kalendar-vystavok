import { describe, expect, it } from 'vitest';
import {
  MAX_RECENT_COLORS,
  pushRecentColor,
  startView,
  weekendFill,
} from '../../../src/domain/settings.ts';
import fixture from '../../fixtures/v2-minimal.json' with { type: 'json' };
import type { DataFile } from '../../../src/domain/types.ts';

const settings = (fixture as DataFile).settings;

describe('weekendFill (SPEC 3.3)', () => {
  it('maps the named tints', () => {
    expect(weekendFill('grey')).toBe('#EFEFEF');
    expect(weekendFill('pink')).toBe('#FCE8F1');
  });

  it('uses a custom colour as is, in upper case', () => {
    expect(weekendFill('#e4dff6')).toBe('#E4DFF6');
  });
});

describe('pushRecentColor (SPEC 5.4)', () => {
  it('puts the colour first', () => {
    expect(pushRecentColor(['#AAAAAA'], '#BBBBBB')).toEqual(['#BBBBBB', '#AAAAAA']);
  });

  it('moves an existing colour to the front instead of duplicating it', () => {
    expect(pushRecentColor(['#AAAAAA', '#BBBBBB'], '#bbbbbb')).toEqual(['#BBBBBB', '#AAAAAA']);
  });

  it('keeps at most 8', () => {
    const full = Array.from({ length: MAX_RECENT_COLORS }, (_, i) => `#0000${String(i)}0`);
    const out = pushRecentColor(full, '#FFFFFF');
    expect(out).toHaveLength(MAX_RECENT_COLORS);
    expect(out[0]).toBe('#FFFFFF');
    expect(out).not.toContain(full[MAX_RECENT_COLORS - 1]);
  });
});

describe('startView (SPEC 5.10)', () => {
  it("'last' opens the remembered year and format", () => {
    expect(startView({ ...settings, startup: 'last' }, 2031)).toEqual({ year: 2027, format: 'h1' });
  });

  it("'current' opens the given current year in the year format", () => {
    expect(startView({ ...settings, startup: 'current' }, 2031)).toEqual({
      year: 2031,
      format: 'year',
    });
  });
});
