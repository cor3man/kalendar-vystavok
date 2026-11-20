// Business rules of SPEC 4.1: unique names, in-use checks.
import type { DataFile, Event, Id } from './types.ts';

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

/** True when no other item (ignoring `exceptId`) has the same name, case-insensitive. */
export function isNameUnique(
  name: string,
  items: readonly { id: Id; name: string }[],
  exceptId: Id | null = null,
): boolean {
  const n = normalizeName(name);
  return !items.some((it) => it.id !== exceptId && normalizeName(it.name) === n);
}

/** Events that use an exhibition; it cannot be deleted while this is non-empty. */
export function eventsUsingExhibition(data: Pick<DataFile, 'events'>, exhibitionId: Id): Event[] {
  return data.events.filter((e) => e.exhibitionId === exhibitionId);
}

/** Events that use a country; it cannot be deleted while this is non-empty. */
export function eventsUsingCountry(data: Pick<DataFile, 'events'>, countryId: Id): Event[] {
  return data.events.filter((e) => e.countryId === countryId);
}
