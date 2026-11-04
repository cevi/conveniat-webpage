import { environmentVariables } from '@/config/environment-variables';
import { countTakenPlaces } from '@/features/visit-day/api/visit-day-places';
import type { VisitDayHof } from '@/features/visit-day/visit-day-settings';
import { listVisitDayHoefe, loadVisitDaySettings } from '@/features/visit-day/visit-day-settings';
import { createTRPCRouter, publicProcedure } from '@/trpc/init';
import config from '@payload-config';
import { getPayload } from 'payload';

/** A Besuchstag with the places still free on it. */
export interface VisitDayPlaces {
  /** `YYYY-MM-DD` */
  date: string;
  /** the places with lunch */
  capacity: number;
  free: number;
  /** the places without lunch */
  capacityWithoutLunch: number;
  freeWithoutLunch: number;
  /**
   * The places left in the Kontingent for visitors without a Hof: `null` without one, so only
   * the places of each kind limit them, and -1 when the day takes none of them.
   */
  freeExternal: number | null;
}

/**
 * The Besuchstag registration, for the relatives filling it in. Public: they have no Cevi.DB
 * login. It tells nothing a visitor of the website may not know: the names of the Höfe, the day
 * each Hof's relatives visit and how many places of each kind a day has left, for visitors
 * without a Hof too.
 */
export const visitDayRouter = createTRPCRouter({
  getVisitDayHofList: publicProcedure.query(async (): Promise<VisitDayHof[]> => {
    if (!environmentVariables.FEATURE_ENABLE_VISIT_DAY) return [];
    const payload = await getPayload({ config });
    return listVisitDayHoefe(payload, await loadVisitDaySettings(payload));
  }),

  getVisitDayList: publicProcedure.query(async ({ ctx }): Promise<VisitDayPlaces[]> => {
    if (!environmentVariables.FEATURE_ENABLE_VISIT_DAY) return [];
    const payload = await getPayload({ config });
    const [settings, taken] = await Promise.all([
      loadVisitDaySettings(payload),
      countTakenPlaces(ctx.prisma),
    ]);
    return settings.days.map((day) => {
      const takenOnDay = taken.get(day.date) ?? { withLunch: 0, withoutLunch: 0, external: 0 };
      let freeExternal: number | null = null;
      if (day.externalCapacity !== undefined) {
        freeExternal =
          day.externalCapacity < 0 ? -1 : Math.max(0, day.externalCapacity - takenOnDay.external);
      }
      return {
        date: day.date,
        capacity: day.capacity,
        free: Math.max(0, day.capacity - takenOnDay.withLunch),
        capacityWithoutLunch: day.capacityWithoutLunch,
        freeWithoutLunch: Math.max(0, day.capacityWithoutLunch - takenOnDay.withoutLunch),
        freeExternal,
      };
    });
  }),
});
