'use client';

import { trpc } from '@/trpc/client';

export interface ConflictingOrganiser {
  id: string;
  fullName: string;
  nickname?: string | null | undefined;
}

export interface ConflictingEntry {
  title: string;
  timeslot: { date: string; time: string };
  /** Who to talk to when the conflict cannot be resolved by switching. */
  organisers: ConflictingOrganiser[];
}

/**
 * The entry a helper is already enrolled in, looked up for the conflict dialog.
 *
 * The server reports a conflict as a name and an id, which is enough to switch but not enough to
 * explain: a *time* conflict whose dialog shows no times leaves the helper to work out for
 * themselves which of two shifts they are looking at. Both feeds are already in the client cache
 * on this page, so this costs no request in the common case.
 */
export const useConflictingEntry = (
  entryId: string | undefined,
  entryType: 'workshop' | 'shift',
): ConflictingEntry | undefined => {
  const isShift = entryType === 'shift';

  const { data: shifts } = trpc.schedule.getHelperShifts.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    enabled: entryId !== undefined && isShift,
  });

  const { data: entries } = trpc.schedule.getScheduleEntries.useQuery(undefined, {
    staleTime: 1000 * 60 * 5,
    enabled: entryId !== undefined && !isShift,
  });

  if (entryId === undefined) return undefined;

  const match = isShift
    ? shifts?.find((shift) => shift.id === entryId)
    : entries?.find((entry) => entry.id === entryId);

  // a conflict against something not in the loaded feed still has a name to show, just no time
  if (match === undefined) return undefined;

  // entries whose organiser relationship was never populated come back as plain ids, which are
  // no use as a contact - they drop out rather than render a chat button that goes nowhere
  const organisers = (match.organiser ?? []).flatMap((entry) =>
    typeof entry === 'string'
      ? []
      : [{ id: entry.id, fullName: entry.fullName, nickname: entry.nickname }],
  );

  return { title: match.title, timeslot: match.timeslot, organisers };
};
