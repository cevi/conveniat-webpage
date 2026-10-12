import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import { parseTimeslot } from '@/features/schedule/utils/time-utils';

export type EntryKind = 'program' | 'fixpoint' | 'meal' | 'transfer';

const KINDS = new Set<string>(['program', 'fixpoint', 'meal', 'transfer']);

/**
 * What an entry is drawn as. Anything without a known kind is a programme block: entries saved
 * before the field existed, and whatever a phone restores from an older copy.
 */
export const kindOf = (entry: Pick<CampScheduleEntryFrontendType, 'kind'>): EntryKind =>
  typeof entry.kind === 'string' && KINDS.has(entry.kind) ? entry.kind : 'program';

export const formLabels: Record<string, string> = { rp: 'RP', hp: 'HP', hpStar: 'HP*' };

/** The Quartiere an entry names, without the dangling ones. Empty means the whole camp. */
export const quartiereOf = (
  entry: Pick<CampScheduleEntryFrontendType, 'quartiere'>,
): { id: string; name: string | undefined }[] =>
  (entry.quartiere ?? []).flatMap((quartier): { id: string; name: string | undefined }[] => {
    if (typeof quartier === 'string') return [{ id: quartier, name: undefined }];
    return quartier === null ? [] : [{ id: quartier.id, name: quartier.name }];
  });

/** Whether an entry concerns one of the given Quartiere: it names one, or it names none. */
export const isForQuartiere = (
  entry: Pick<CampScheduleEntryFrontendType, 'quartiere'>,
  quartierIds: ReadonlySet<string>,
): boolean => {
  const quartiere = quartiereOf(entry);
  return quartiere.length === 0 || quartiere.some(({ id }) => quartierIds.has(id));
};

/**
 * Start and end of an entry in minutes from midnight. A block that runs past midnight
 * (`"22:30 - 00:00"`) ends after it starts, on the day it began.
 */
export const slotOf = (
  entry: Pick<CampScheduleEntryFrontendType, 'timeslot'>,
): { start: number; end: number } | undefined => {
  const slot = parseTimeslot(entry.timeslot.time);
  if (slot === undefined) return undefined;
  return slot.end < slot.start ? { start: slot.start, end: slot.end + 1440 } : slot;
};

/** Chronological, and the longer of two entries starting together first. */
export const byStart = (
  a: Pick<CampScheduleEntryFrontendType, 'timeslot'>,
  b: Pick<CampScheduleEntryFrontendType, 'timeslot'>,
): number => {
  const slotA = slotOf(a);
  const slotB = slotOf(b);
  return (slotA?.start ?? 0) - (slotB?.start ?? 0) || (slotB?.end ?? 0) - (slotA?.end ?? 0);
};

export interface NowAndNext<T> {
  /** what runs at `now`, if anything */
  current: T | undefined;
  /** how far `current` has come, from 0 to 1 */
  progress: number;
  /** minutes until `current` ends */
  minutesLeft: number;
  /** the first thing to start after `now` */
  next: T | undefined;
  /** minutes until `next` starts */
  minutesUntilNext: number;
}

/**
 * What is on right now and what comes after it, out of the entries of one day.
 *
 * Transfers are skipped on both sides: "now: 15 min Verschiebung" tells nobody where to be,
 * the block they are walking to does. Meals and fixed points count, because the next thing
 * after a game is often lunch.
 */
export const findNowAndNext = <T extends Pick<CampScheduleEntryFrontendType, 'timeslot' | 'kind'>>(
  entriesOfToday: readonly T[],
  minutesOfDay: number,
): NowAndNext<T> => {
  const candidates = entriesOfToday
    .filter((entry) => kindOf(entry) !== 'transfer' && slotOf(entry) !== undefined)
    .sort(byStart);

  // the latest to have started wins, so a programme block beats the all-day entry around it
  const running = candidates.filter((entry) => {
    const slot = slotOf(entry);
    return slot !== undefined && slot.start <= minutesOfDay && minutesOfDay < slot.end;
  });
  const current = running.at(-1);
  const next = candidates.find((entry) => (slotOf(entry)?.start ?? 0) > minutesOfDay);

  const currentSlot = current === undefined ? undefined : slotOf(current);
  const nextSlot = next === undefined ? undefined : slotOf(next);
  return {
    current,
    progress:
      currentSlot === undefined
        ? 0
        : (minutesOfDay - currentSlot.start) / (currentSlot.end - currentSlot.start),
    minutesLeft: currentSlot === undefined ? 0 : currentSlot.end - minutesOfDay,
    next,
    minutesUntilNext: nextSlot === undefined ? 0 : nextSlot.start - minutesOfDay,
  };
};

type Step = NonNullable<CampScheduleEntryFrontendType['steps']>[number];

/**
 * Gives every step of a block its clock time, counted up from the start of the block. The
 * same description then reads right for each Quartier, whenever its slot is.
 */
export const withClockTimes = (
  steps: readonly Step[],
  startMinutes: number,
): (Step & { startsAt: number })[] => {
  let startsAt = startMinutes;
  return steps.map((step) => {
    const timed = { ...step, startsAt };
    startsAt += Number.isFinite(step.duration) ? step.duration : 0;
    return timed;
  });
};

/**
 * The other slots of the same block on the same day: the Quartiere take turns, so "Kennenlernspiel"
 * runs once at 13:45 and once at 15:45. Matched by title, which is how the programme names a block.
 */
export const findOtherSlots = <
  T extends Pick<CampScheduleEntryFrontendType, 'id' | 'title' | 'timeslot' | 'kind'>,
>(
  entries: readonly T[],
  entry: T,
): T[] =>
  entries
    .filter(
      (other) =>
        other.id !== entry.id &&
        kindOf(other) === 'program' &&
        other.title === entry.title &&
        other.timeslot.date === entry.timeslot.date,
    )
    .sort(byStart);
