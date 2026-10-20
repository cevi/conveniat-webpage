import type { StaticTranslationString } from '@/types/types';

export interface CampPhase {
  key: 'setup' | 'main' | 'teardown';
  label: StaticTranslationString;
  /** Inclusive first day, as `YYYY-MM-DD`. */
  startDate: string;
  /** Inclusive last day, as `YYYY-MM-DD`. */
  endDate: string;
}

/**
 * The phases of conveniat27, shown on the availability calendar so a helper sees which part
 * of the camp the days they tap belong to. The Scharniertag (03.08.) counts as Abbau, since
 * the children have left by then.
 *
 * Fixed in code rather than set per form: a konekta form whose window lies outside these
 * days simply shows no phases. Once konekta needs its own, this belongs into an env value.
 */
export const CAMP_PHASES: readonly CampPhase[] = [
  {
    key: 'setup',
    label: { de: 'Aufbaulager', en: 'Setup camp', fr: 'Camp de montage' },
    startDate: '2027-07-12',
    endDate: '2027-07-23',
  },
  {
    key: 'main',
    label: { de: 'Hauptlager', en: 'Main camp', fr: 'Camp principal' },
    startDate: '2027-07-24',
    endDate: '2027-08-02',
  },
  {
    key: 'teardown',
    label: { de: 'Abbaulager', en: 'Teardown camp', fr: 'Camp de démontage' },
    startDate: '2027-08-03',
    endDate: '2027-08-15',
  },
];

/** The phase an ISO day falls into, or undefined outside the camp. */
export const findCampPhase = (isoDay: string): CampPhase | undefined =>
  CAMP_PHASES.find((phase) => isoDay >= phase.startDate && isoDay <= phase.endDate);

/** The phases that share at least one day with the given window, in camp order. */
export const getCampPhasesWithin = (firstDay: string, lastDay: string): CampPhase[] =>
  CAMP_PHASES.filter((phase) => phase.startDate <= lastDay && phase.endDate >= firstDay);
