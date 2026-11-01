import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import {
  byStart,
  findNowAndNext,
  isForQuartiere,
  kindOf,
  slotOf,
} from '@/features/schedule/utils/programme-utils';
import { dayKeyOf } from '@/features/schedule/utils/time-utils';
import { campClockOf } from '@/utils/camp-clock';

type JetztEntry = Pick<CampScheduleEntryFrontendType, 'id' | 'timeslot' | 'kind' | 'quartiere'>;

export interface Jetzt<T> {
  /** the block on the card: what runs now, or else the next one */
  lead: T | undefined;
  /** whether `lead` is running; otherwise it is still ahead */
  isRunning: boolean;
  /** minutes until `lead` ends when it runs, until it starts otherwise */
  minutes: number;
  /** what starts later today, after `lead` */
  later: T[];
}

/**
 * What Home shows under "Jetzt", on the camp's clock: the block running now, or the next one,
 * and a few rows of what comes after it.
 *
 * It answers for the user's own Quartiere, as Programm does. Without one, a guest or somebody
 * without a Hof, it answers for the Gesamtlager: the entries that name no Quartier, since a
 * guest cannot tell one Quartier's slot from another's.
 */
export const selectJetzt = <T extends JetztEntry>(
  entries: readonly T[],
  myQuartierIds: ReadonlySet<string>,
  now: Date,
  laterCount: number,
): Jetzt<T> => {
  const { dayKey, minutes: minutesOfDay } = campClockOf(now);
  const today = entries.filter(
    (entry) =>
      dayKeyOf(entry.timeslot.date) === dayKey &&
      (myQuartierIds.size > 0
        ? isForQuartiere(entry, myQuartierIds)
        : (entry.quartiere ?? []).length === 0),
  );
  const { current, minutesLeft, next, minutesUntilNext } = findNowAndNext(today, minutesOfDay);
  const lead = current ?? next;
  const later = today
    .filter(
      (entry) =>
        entry.id !== lead?.id &&
        kindOf(entry) !== 'transfer' &&
        (slotOf(entry)?.start ?? -1) > minutesOfDay,
    )
    .sort(byStart)
    .slice(0, laterCount);

  return {
    lead,
    isRunning: current !== undefined,
    minutes: current === undefined ? minutesUntilNext : minutesLeft,
    later,
  };
};
