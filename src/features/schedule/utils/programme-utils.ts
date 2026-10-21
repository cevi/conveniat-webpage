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

/**
 * Whether an entry is logistics rather than programme: a meal, a transfer or a fixed point such
 * as Anreise. The filter "Anreise & Essen anzeigen" hides these.
 */
export const isLogistics = (entry: Pick<CampScheduleEntryFrontendType, 'kind'>): boolean =>
  kindOf(entry) !== 'program';

export type TimeOfDay = 'morning' | 'afternoon' | 'evening';

export const TIMES_OF_DAY: readonly TimeOfDay[] = ['morning', 'afternoon', 'evening'];

/**
 * The part of the day an entry starts in: Morgen before 12:00, Nachmittag until 17:59, Abend
 * from 18:00. The times of the programme are the camp's wall clock, Europe/Zurich, so the phone's
 * timezone plays no part. An entry without a readable time belongs to none.
 */
export const timeOfDayOf = (
  entry: Pick<CampScheduleEntryFrontendType, 'timeslot'>,
): TimeOfDay | undefined => {
  const start = slotOf(entry)?.start;
  if (start === undefined) return undefined;
  if (start < 12 * 60) return 'morning';
  return start < 18 * 60 ? 'afternoon' : 'evening';
};

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
  // Asked of the stored list, not the cleaned one: a block whose only Quartier was deleted
  // belongs to nobody until an editor fixes it, it must not turn into one for the whole camp.
  if ((entry.quartiere ?? []).length === 0) return true;
  return quartiereOf(entry).some(({ id }) => quartierIds.has(id));
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
    // whole minutes only: the field takes any number, and "09:1.5" is not a time
    startsAt += Number.isFinite(step.duration) ? Math.max(0, Math.round(step.duration)) : 0;
    return timed;
  });
};

const relationIdOf = (value: string | { id: string } | null | undefined): string | undefined =>
  typeof value === 'string' ? value : (value?.id ?? undefined);

/**
 * Whether two entries are slots of the same block: the Quartiere take turns, so "Ballspiele" runs
 * at 17:00 for Q4–Q6 and again for Q7–Q8. There is no block field; a block is the same programme
 * title at the same place in the same category on the same day.
 */
export const isSameBlock = (
  a: Pick<CampScheduleEntryFrontendType, 'title' | 'timeslot' | 'kind' | 'location' | 'category'>,
  b: Pick<CampScheduleEntryFrontendType, 'title' | 'timeslot' | 'kind' | 'location' | 'category'>,
): boolean =>
  kindOf(a) === 'program' &&
  kindOf(b) === 'program' &&
  a.title === b.title &&
  a.timeslot.date === b.timeslot.date &&
  relationIdOf(a.location) === relationIdOf(b.location) &&
  relationIdOf(a.category) === relationIdOf(b.category);

/** The other slots of the same block on the same day, in order. */
export const findOtherSlots = <
  T extends Pick<
    CampScheduleEntryFrontendType,
    'id' | 'title' | 'timeslot' | 'kind' | 'location' | 'category'
  >,
>(
  entries: readonly T[],
  entry: T,
): T[] =>
  entries.filter((other) => other.id !== entry.id && isSameBlock(entry, other)).sort(byStart);

const normalizedText = (text: string): string =>
  text
    .toLowerCase()
    .replaceAll(/\s+/g, ' ')
    .trim()
    .replace(/[.!?…:;,]+$/, '')
    .trim();

/** The words of a Lexical rich text, whatever shape a draft left it in. */
const textOfRichText = (node: unknown): string => {
  if (typeof node !== 'object' || node === null) return '';
  const { text, children, root } = node as { text?: unknown; children?: unknown; root?: unknown };
  if (typeof text === 'string') return text;
  if (root !== undefined) return textOfRichText(root);
  return Array.isArray(children) ? children.map((child) => textOfRichText(child)).join(' ') : '';
};

/**
 * Whether a block's description says nothing the title does not: empty, or the title again, as
 * in "Ballspiele." under "Ballspiele". Drafts skip validation, so a description in any shape is
 * read for its words, and one without any counts as empty.
 */
export const isDescriptionRedundant = (description: unknown, title: string): boolean => {
  const normalized = normalizedText(textOfRichText(description));
  return normalized === '' || normalized === normalizedText(title);
};

/**
 * What comes after a block on its own timeline, the one of the Quartiere it is for: the next
 * stop, often a meal, and the next block, which has a page to open.
 */
export const findWhatComesNext = <
  T extends Pick<CampScheduleEntryFrontendType, 'id' | 'kind' | 'timeslot' | 'quartiere'>,
>(
  entries: readonly T[],
  current: T,
  quartierIds: ReadonlySet<string>,
): { next: T | undefined; nextBlock: T | undefined } => {
  const end = slotOf(current)?.end ?? 0;
  const later = entries
    .filter(
      (entry) =>
        entry.id !== current.id &&
        kindOf(entry) !== 'transfer' &&
        entry.timeslot.date === current.timeslot.date &&
        (slotOf(entry)?.start ?? -1) >= end &&
        isForQuartiere(entry, quartierIds),
    )
    .sort(byStart);
  return { next: later[0], nextBlock: later.find((entry) => kindOf(entry) === 'program') };
};
