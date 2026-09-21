'use client';

import type { RouterOutputs } from '@/trpc/client';
import { trpc } from '@/trpc/client';

/** The enrolment status of one shift, as `shifts.getShiftStatus` answers it. */
export type ShiftStatus = NonNullable<RouterOutputs['shifts']['getShiftStatus']>;

export interface ShiftStatusResult {
  /** `undefined` covers both "not loaded yet" and "the shift is gone" - see `isLoading`. */
  status: ShiftStatus | undefined;
  isLoading: boolean;
  isFetching: boolean;
  refetch: () => void;
}

/**
 * The enrolment status of a shift, shared by every part of the card that renders it.
 *
 * Passing `undefined` holds the query: nothing is fetched until there is a shift to ask about.
 *
 * The card shows the status in three places - how full the shift is, the capacity rail, and the
 * enrolment control - and the detail sheet shows it again. They all read the same query key, so
 * React Query serves them from one cache entry and one request; extracting the options here is
 * what keeps those observers from disagreeing about staleness.
 */
export const useShiftStatus = (shiftId: string | undefined): ShiftStatusResult => {
  const { data, isLoading, isFetching, refetch } = trpc.shifts.getShiftStatus.useQuery(
    { shiftId: shiftId ?? '' },
    {
      // `undefined` is a caller that has no shift to ask about yet - the conflict dialog before
      // it knows which shift it is arguing about - not a shift whose status is missing
      enabled: shiftId !== undefined && shiftId !== '',
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24 * 7,
      // The global default is `refetchOnMount: false`, which meant a cached value was never
      // revalidated by reopening the shift — only a reconnect or an unrelated enrollment could
      // clear it. Combined with the 7-day `gcTime` and disk persistence, one bad value stuck.
      // A plain `true` would still respect `staleTime`, so a value cached less than five minutes
      // ago would survive the next visit; an empty status is never worth keeping for a moment, so
      // refetch it unconditionally and leave real data on the normal staleness schedule.
      refetchOnMount: (query) => (query.state.data == undefined ? 'always' : true),
    },
  );

  return {
    status: data ?? undefined,
    isLoading,
    isFetching,
    refetch: (): void => void refetch(),
  };
};
