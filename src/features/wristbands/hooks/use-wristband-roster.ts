'use client';
import type { SealedWristbandRoster } from '@/features/wristbands/types';
import { useTRPC } from '@/trpc/client';
import { useEffect } from 'react';

import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface RosterOnPhone {
  /** undefined until the list was loaded once on this phone */
  data: SealedWristbandRoster | undefined;
  /** when the list on the phone was loaded, 0 if never */
  updatedAt: number;
  fetching: boolean;
}

/**
 * The list of every band that security and first aid read offline. It is a query like any
 * other, so the persisted query cache keeps it on the phone, sealed so that it names nobody
 * without the band in hand; only the people the server lets read ever hold it, the request of
 * everyone else is refused. Loaded again whenever the
 * page opens with a connection. A phone whose user may no longer read drops it.
 */
export const useWristbandRoster = (reader: boolean | undefined): RosterOnPhone => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const query = useQuery(
    trpc.wristband.getSealedWristbandRoster.queryOptions(undefined, {
      enabled: reader === true,
      refetchOnMount: 'always',
    }),
  );

  useEffect(() => {
    if (reader === false)
      void queryClient.resetQueries(trpc.wristband.getSealedWristbandRoster.pathFilter());
  }, [reader, queryClient, trpc]);

  return {
    data: reader === true ? query.data : undefined,
    updatedAt: query.dataUpdatedAt,
    fetching: query.isFetching,
  };
};
