// Counts shown before an import replaces the data (SPEC 4.7).
import type { DataFile } from '../domain/types.ts';

export interface DataSummary {
  exhibitions: number;
  events: number;
  countries: number;
  holidays: number;
}

export function summarizeData(data: DataFile): DataSummary {
  return {
    exhibitions: data.exhibitions.length,
    events: data.events.length,
    countries: data.countries.length,
    holidays: data.holidays.length,
  };
}
