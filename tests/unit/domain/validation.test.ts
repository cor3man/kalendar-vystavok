import { describe, expect, it } from 'vitest';
import {
  eventsUsingCountry,
  eventsUsingExhibition,
  isNameUnique,
} from '../../../src/domain/validation.ts';
import { isPaletteId, PALETTE, paletteHex } from '../../../src/domain/palette.ts';
import type { Event } from '../../../src/domain/types.ts';

const items = [
  { id: '1', name: 'TransLogistica' },
  { id: '2', name: 'CeMAT Asia' },
];

describe('isNameUnique', () => {
  it('compares case-insensitively and trimmed', () => {
    expect(isNameUnique('translogistica', items)).toBe(false);
    expect(isNameUnique('  CEMAT ASIA ', items)).toBe(false);
    expect(isNameUnique('TransLogistica Caspian', items)).toBe(true);
  });

  it('ignores the item being edited', () => {
    expect(isNameUnique('TRANSLOGISTICA', items, '1')).toBe(true);
    expect(isNameUnique('cemat asia', items, '1')).toBe(false);
  });
});

describe('in-use checks', () => {
  const base: Event = {
    id: 'e1',
    exhibitionId: 'x1',
    start: '2027-01-01',
    end: '2027-01-01',
    city: '',
    countryId: 'ru',
    color: '#D2D2D2',
    held: false,
    note: '',
  };
  const data = { events: [base, { ...base, id: 'e2', exhibitionId: 'x2', countryId: null }] };

  it('lists events using an exhibition', () => {
    expect(eventsUsingExhibition(data, 'x1').map((e) => e.id)).toEqual(['e1']);
    expect(eventsUsingExhibition(data, 'x3')).toEqual([]);
  });

  it('lists events using a country', () => {
    expect(eventsUsingCountry(data, 'ru').map((e) => e.id)).toEqual(['e1']);
    expect(eventsUsingCountry(data, 'de')).toEqual([]);
  });
});

describe('palette', () => {
  it('has the ten colours of Appendix C', () => {
    expect(PALETTE).toHaveLength(10);
    expect(paletteHex('lilac')).toBe('#B3A7E0');
    expect(paletteHex('turquoise')).toBe('#BFE6E0');
    expect(isPaletteId('grey')).toBe(true);
    expect(isPaletteId('red')).toBe(false);
  });
});
