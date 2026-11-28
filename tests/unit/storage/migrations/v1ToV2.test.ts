import { describe, expect, it } from 'vitest';
import { v1ToV2 } from '../../../../src/storage/migrations/v1ToV2.ts';
import { parseDataFile } from '../../../../src/storage/schema.ts';
import v1 from '../../../fixtures/v1-minimal.json' with { type: 'json' };
import v2 from '../../../fixtures/v2-minimal.json' with { type: 'json' };

describe('v1 → v2 (SPEC 4.5)', () => {
  it('turns the real v1 fixture into the v2 fixture', () => {
    expect(v1ToV2(structuredClone(v1))).toEqual(v2);
  });

  it('keeps the pink weekend tint v1 files were printed with', () => {
    const out = v1ToV2(structuredClone(v1)) as { settings: { weekendTint: string } };
    expect(out.settings.weekendTint).toBe('pink');
  });

  it('keeps settings fields that are already present', () => {
    const raw = { ...structuredClone(v1), settings: { ...v1.settings, heldMark: 'none' } };
    const out = v1ToV2(raw) as { settings: Record<string, unknown> };
    expect(out.settings).toMatchObject({ heldMark: 'none', lastYear: 2027, lastFormat: 'h1' });
  });

  it('does not change its input', () => {
    const raw = structuredClone(v1);
    v1ToV2(raw);
    expect(raw).toEqual(v1);
  });

  it('runs on load: a v1 file opens as valid v2 data', () => {
    const r = parseDataFile(JSON.stringify(v1));
    expect(r).toEqual({ kind: 'ok', data: v2, migratedFrom: 1 });
  });
});
