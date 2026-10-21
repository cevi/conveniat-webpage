import type { CampScheduleEntryFrontendType } from '@/features/schedule/types/types';
import {
  byStart,
  isSameBlock,
  kindOf,
  quartiereOf,
  slotOf,
} from '@/features/schedule/utils/programme-utils';
import { quartierNumberOf } from '@/utils/quartier-names';

type Entry = CampScheduleEntryFrontendType;

/** A programme block or a meal or fixed point: one entry, or the slots of several Quartiere. */
export interface TimelineStop {
  type: 'block' | 'logistics';
  key: string;
  /** the entries behind it, in order; more than one only where the slots are grouped */
  slots: [Entry, ...Entry[]];
}

/** The walk between two stops, drawn on the rail instead of as an entry of its own. */
export interface TimelineTransfer {
  type: 'transfer';
  key: string;
  /** how long the walk is, when there is one answer for everybody */
  minutes: number | undefined;
  /** where the walk goes: the stop after it, none for the walk that ends the day */
  to: Entry | undefined;
  /** the Quartiere walk at different times, as in the view of the whole camp */
  perQuartier: boolean;
  slots: [Entry, ...Entry[]];
}

export type TimelineItem = TimelineStop | TimelineTransfer;

/** a meal of another Quartier starts at most this long after the one before it */
const MAXIMUM_LOGISTICS_SHIFT = 60;

const quartierIdsOf = (entry: Entry): string[] => quartiereOf(entry).map(({ id }) => id);

const lowestQuartierOf = (entry: Entry): number =>
  Math.min(
    ...quartiereOf(entry).map(({ name }) => quartierNumberOf(name) ?? Number.POSITIVE_INFINITY),
    Number.POSITIVE_INFINITY,
  );

/**
 * Whether an entry is the slot of another Quartier for a stop that is already on the timeline.
 * Only entries that name their Quartiere take turns, and never twice for the same Quartier.
 */
const isAnotherSlotOf = (stop: TimelineStop, entry: Entry): boolean => {
  const ids = quartierIdsOf(entry);
  if (ids.length === 0) return false;
  const taken = new Set(stop.slots.flatMap((slot) => quartierIdsOf(slot)));
  if (stop.slots.some((slot) => quartierIdsOf(slot).length === 0)) return false;
  if (ids.some((id) => taken.has(id))) return false;

  const first = stop.slots[0];
  if (stop.type === 'block') return isSameBlock(first, entry);

  const last = stop.slots.at(-1) as Entry;
  return (
    kindOf(first) === kindOf(entry) &&
    first.title === entry.title &&
    (slotOf(entry)?.start ?? 0) - (slotOf(last)?.start ?? 0) <= MAXIMUM_LOGISTICS_SHIFT
  );
};

/**
 * The programme of one day as the timeline draws it.
 *
 * - With `groupSlots`, for the whole camp, the slots of one block become one stop at the time
 *   of the first, and so does a meal the Quartiere take one after the other.
 * - A transfer is never a stop: it becomes the stretch of rail before the next stop. Where the
 *   Quartiere walk at different times it says so instead of naming one duration.
 */
export const buildTimeline = (
  entries: readonly Entry[],
  { groupSlots }: { groupSlots: boolean },
): TimelineItem[] => {
  const sorted = [...entries].sort(byStart);

  const stops: TimelineStop[] = [];
  for (const entry of sorted) {
    const kind = kindOf(entry);
    if (kind === 'transfer') continue;
    const type = kind === 'program' ? 'block' : 'logistics';
    const stop = groupSlots
      ? stops.find((candidate) => candidate.type === type && isAnotherSlotOf(candidate, entry))
      : undefined;
    if (stop === undefined) stops.push({ type, key: entry.id, slots: [entry] });
    else stop.slots.push(entry);
  }

  // slots that start together are listed by their Quartiere, Q4–Q6 before Q7–Q8
  for (const stop of stops) {
    stop.slots.sort(
      (a, b) =>
        (slotOf(a)?.start ?? 0) - (slotOf(b)?.start ?? 0) ||
        lowestQuartierOf(a) - lowestQuartierOf(b),
    );
  }

  // each transfer leads to the first stop that starts after it does; the walk home after the
  // last stop leads nowhere on this day, and still belongs on it
  const transfersBefore = new Map<TimelineStop | undefined, Entry[]>();
  for (const transfer of sorted.filter((entry) => kindOf(entry) === 'transfer')) {
    const start = slotOf(transfer)?.start ?? 0;
    const next = stops.find((stop) => (slotOf(stop.slots[0])?.start ?? 0) > start);
    transfersBefore.set(next, [...(transfersBefore.get(next) ?? []), transfer]);
  }

  const transferTo = (stop?: TimelineStop): TimelineTransfer[] => {
    const transfers = transfersBefore.get(stop);
    if (transfers === undefined) return [];

    const durations = transfers.map((transfer) => {
      const slot = slotOf(transfer);
      return slot === undefined ? 0 : slot.end - slot.start;
    });
    const isOneDuration = durations.every((duration) => duration === durations[0]);
    const perQuartier =
      groupSlots && transfers.some((transfer) => quartierIdsOf(transfer).length > 0);

    let minutes: number | undefined;
    if (isOneDuration) minutes = durations[0];
    else if (!perQuartier) minutes = durations.reduce((sum, duration) => sum + duration, 0);

    return [
      {
        type: 'transfer',
        key: `transfer-${transfers.map(({ id }) => id).join('-')}`,
        minutes: minutes === 0 ? undefined : minutes,
        to: stop?.slots[0],
        perQuartier,
        slots: transfers as [Entry, ...Entry[]],
      },
    ];
  };

  return [
    ...stops.flatMap((stop): TimelineItem[] => [...transferTo(stop), stop]),
    ...transferTo(),
  ];
};

/** The minutes from midnight a timeline item starts at: its first slot's. */
export const startOfItem = (item: TimelineItem): number => slotOf(item.slots[0])?.start ?? 0;

/** The minutes from midnight a timeline item is over at: its last slot's end. */
export const endOfItem = (item: TimelineItem): number =>
  Math.max(...item.slots.map((slot) => slotOf(slot)?.end ?? 0));
