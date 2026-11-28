import { describe, expect, it } from 'vitest';
import { clickShift } from '../../../src/ui/calendar/clickShift.ts';

const none = { kind: 'none' };

describe('clickShift (SPEC 5.3)', () => {
  it('a click on an empty day marks it, without a dialog', () => {
    expect(clickShift(null, { day: '2027-03-16', eventId: null, shift: false })).toEqual({
      start: '2027-03-16',
      action: none,
    });
  });

  it('Shift+click creates the range in date order and clears the mark', () => {
    expect(clickShift('2027-04-02', { day: '2027-03-31', eventId: null, shift: true })).toEqual({
      start: null,
      action: { kind: 'create', start: '2027-03-31', end: '2027-04-02' },
    });
  });

  it('Shift+click on the marked day gives a one-day event', () => {
    expect(clickShift('2027-03-16', { day: '2027-03-16', eventId: null, shift: true })).toEqual({
      start: null,
      action: { kind: 'create', start: '2027-03-16', end: '2027-03-16' },
    });
  });

  it('Shift+click over an event counts as a day, not as an edit', () => {
    expect(clickShift('2027-03-14', { day: '2027-03-17', eventId: 'ev', shift: true })).toEqual({
      start: null,
      action: { kind: 'create', start: '2027-03-14', end: '2027-03-17' },
    });
  });

  it('Shift+click without a mark only marks the day', () => {
    expect(clickShift(null, { day: '2027-03-16', eventId: 'ev', shift: true })).toEqual({
      start: '2027-03-16',
      action: none,
    });
  });

  it('a plain click on another empty day moves the mark', () => {
    expect(clickShift('2027-03-16', { day: '2027-05-01', eventId: null, shift: false })).toEqual({
      start: '2027-05-01',
      action: none,
    });
  });

  it('a click on an event opens it and clears the mark', () => {
    expect(clickShift('2027-03-16', { day: '2027-03-17', eventId: 'ev', shift: false })).toEqual({
      start: null,
      action: { kind: 'edit', eventId: 'ev' },
    });
    expect(clickShift(null, { day: '2027-03-17', eventId: 'ev', shift: false }).action).toEqual({
      kind: 'edit',
      eventId: 'ev',
    });
  });
});
