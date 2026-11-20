// Zustand store (SPEC 6.1). M1: read-only seed data plus the selected year and format.
// Editing actions and the undo history arrive in M4, storage in M3.
import { create } from 'zustand';
import type { DataFile, FormatId } from '../domain/types.ts';
import { buildSeed } from '../storage/seed.ts';
import { appVersion } from '../version.ts';
import { todayISO } from './clock.ts';

/** Years the toolbar accepts. Orthodox Easter (holidays) is defined for 1900–2099. */
export const MIN_YEAR = 2000;
export const MAX_YEAR = 2098;

export interface CalendarState {
  data: DataFile;
  year: number;
  format: FormatId;
  setYear: (year: number) => void;
  setFormat: (format: FormatId) => void;
}

export function clampYear(year: number): number {
  return Math.min(MAX_YEAR, Math.max(MIN_YEAR, Math.round(year)));
}

function initialData(): DataFile {
  const today = todayISO();
  return buildSeed({
    currentYear: Number(today.slice(0, 4)),
    appVersion,
    savedAt: new Date().toISOString(),
  });
}

const data = initialData();

export const useCalendarStore = create<CalendarState>()((set) => ({
  data,
  year: data.settings.lastYear,
  format: data.settings.lastFormat,
  setYear: (year) => {
    if (Number.isFinite(year)) set({ year: clampYear(year) });
  },
  setFormat: (format) => {
    set({ format });
  },
}));
