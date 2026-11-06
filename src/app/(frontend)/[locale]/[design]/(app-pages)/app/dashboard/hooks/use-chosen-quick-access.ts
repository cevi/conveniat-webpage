'use client';
import type { QuickAccessTileId } from '@/features/settings/quick-access';
import {
  DEFAULT_QUICK_ACCESS,
  isDefaultQuickAccess,
  knownQuickAccessTiles,
} from '@/features/settings/quick-access';
import { useTRPC } from '@/trpc/client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

/**
 * The tiles of the user's Schnellzugriff, in their order, and the way to change them. The choice
 * belongs to the account and is kept on the server: it follows the user to every device and is
 * back after an expired session, while a logout, which drops the persisted query cache, leaves
 * nothing of it for the next person on the phone. A guest, and the preview of the landing page,
 * get the default.
 *
 * A change shows at once and is saved behind it. Offline the save waits for the network; a save
 * that fails puts back what the server has.
 *
 * @param enabled - whether this user has a choice of their own, i.e. is signed in
 */
export const useChosenQuickAccess = (
  enabled: boolean,
): {
  chosen: readonly QuickAccessTileId[];
  /** the choice is not known yet; showing the default would jump once it arrives */
  isLoading: boolean;
  isCustomized: boolean;
  saveFailed: boolean;
  setChosen: (next: readonly QuickAccessTileId[]) => void;
} => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const query = useQuery(trpc.quickAccess.getQuickAccess.queryOptions(undefined, { enabled }));
  const update = useMutation(
    trpc.quickAccess.updateQuickAccess.mutationOptions({
      // one after the other, so the last change is the one that stays
      scope: { id: 'quick-access' },
      onMutate: async ({ tiles }) => {
        await queryClient.cancelQueries(trpc.quickAccess.getQuickAccess.pathFilter());
        queryClient.setQueryData(trpc.quickAccess.getQuickAccess.queryKey(), {
          tiles: knownQuickAccessTiles(tiles) ?? null,
        });
      },
      onError: () => queryClient.invalidateQueries(trpc.quickAccess.getQuickAccess.pathFilter()),
    }),
  );

  // read defensively: the persisted cache may hold a shape of an older release
  const chosen = enabled
    ? (knownQuickAccessTiles(query.data?.tiles) ?? DEFAULT_QUICK_ACCESS)
    : DEFAULT_QUICK_ACCESS;

  return {
    chosen,
    // offline without a cached answer the query waits; the default is better than nothing
    isLoading: enabled && query.data === undefined && query.fetchStatus === 'fetching',
    isCustomized: !isDefaultQuickAccess(chosen),
    saveFailed: update.isError,
    setChosen: (next) => update.mutate({ tiles: [...next] }),
  };
};
