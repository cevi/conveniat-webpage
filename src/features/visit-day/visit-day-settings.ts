import { getHofDirectory } from '@/features/payload-cms/payload-cms/utils/hof-directory';
import type { Payload } from 'payload';

/** One Besuchstag as the registration uses it. */
export interface VisitDay {
  /** the calendar day, `YYYY-MM-DD` */
  date: string;
  /** the places with lunch */
  capacity: number;
  /** the places of those who bring their own lunch */
  capacityWithoutLunch: number;
  /**
   * The persons without a Hof the day takes, within its places of either kind; -1 takes none,
   * and absent means no limit of their own.
   */
  externalCapacity?: number;
  quartierIds: string[];
}

/** A Hof the registration offers, with the day its relatives visit. */
export interface VisitDayHof {
  id: string;
  name: string;
  date: string;
}

export interface VisitDaySettings {
  days: VisitDay[];
  hiddenHofIds: Set<string>;
}

const idOf = (value: string | { id: string }): string =>
  typeof value === 'string' ? value : value.id;

/**
 * The calendar day of a date field. Payload stores a day-only date as an instant around noon
 * in the editor's timezone, so the day is read in the camp's timezone, never in UTC.
 */
export const toCampDay = (value: unknown): string | undefined => {
  if (typeof value !== 'string' || value === '') return undefined;
  const instant = new Date(value);
  if (Number.isNaN(instant.getTime())) return undefined;
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Zurich' }).format(instant);
};

/** The day as Postgres stores a `@db.Date`: midnight UTC of that calendar day. */
export const toDatabaseDate = (day: string): Date => new Date(`${day}T00:00:00.000Z`);

/**
 * Reads the Besuchstag global. Its rows are read leniently: a day without a date or capacity
 * offers no places, so a half-filled row in the admin panel closes nothing that was open, and a
 * day without places without lunch offers none of them. An empty Kontingent for visitors without
 * a Hof sets them no limit of their own, as before it existed.
 */
export const loadVisitDaySettings = async (payload: Payload): Promise<VisitDaySettings> => {
  const settings = await payload.findGlobal({ slug: 'visit-day', depth: 0, overrideAccess: true });
  const days = (settings.days ?? []).flatMap((row): VisitDay[] => {
    const date = toCampDay(row.date);
    if (date === undefined || typeof row.capacity !== 'number') return [];
    const quartierIds = row.quartiere.map((quartier) => idOf(quartier));
    const capacityWithoutLunch =
      typeof row.capacityWithoutLunch === 'number' ? row.capacityWithoutLunch : 0;
    const externalCapacity =
      typeof row.externalCapacity === 'number' ? { externalCapacity: row.externalCapacity } : {};
    return [
      { date, capacity: row.capacity, capacityWithoutLunch, ...externalCapacity, quartierIds },
    ];
  });
  const hiddenHofIds = new Set((settings.hiddenHoefe ?? []).map((hof) => idOf(hof)));
  return { days, hiddenHofIds };
};

/**
 * The Höfe the registration offers: every Hof whose Quartier visits on one of the days, minus
 * the hidden ones. Only name and day leave the server, never anything about the AVP.
 */
export const listVisitDayHoefe = async (
  payload: Payload,
  settings: VisitDaySettings,
): Promise<VisitDayHof[]> => {
  const dayOfQuartier = new Map(
    settings.days.flatMap((day) => day.quartierIds.map((id) => [id, day.date] as const)),
  );
  const directory = await getHofDirectory(payload);
  return [...directory]
    .flatMap(([id, hof]): VisitDayHof[] => {
      if (settings.hiddenHofIds.has(id)) return [];
      const date = hof.quartier === undefined ? undefined : dayOfQuartier.get(hof.quartier.id);
      return date === undefined ? [] : [{ id, name: hof.name, date }];
    })
    .toSorted((a, b) => a.name.localeCompare(b.name, 'de'));
};
