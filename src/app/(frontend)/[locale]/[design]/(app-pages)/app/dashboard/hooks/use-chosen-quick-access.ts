'use client';

import type { QuickAccessTileId } from '@/features/settings/quick-access';
import {
  DEFAULT_QUICK_ACCESS,
  isDefaultQuickAccess,
  knownQuickAccessTiles,
} from '@/features/settings/quick-access';
import { trpc } from '@/trpc/client';

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
  const utils = trpc.useUtils();
  const query = trpc.quickAccess.getQuickAccess.useQuery(undefined, { enabled });
  const update = trpc.quickAccess.updateQuickAccess.useMutation({
    // one after the other, so the last change is the one that stays
    scope: { id: 'quick-access' },
    onMutate: async ({ tiles }) => {
      await utils.quickAccess.getQuickAccess.cancel();
      utils.quickAccess.getQuickAccess.setData(undefined, {
        tiles: knownQuickAccessTiles(tiles) ?? null,
      });
    },
    onError: () => utils.quickAccess.getQuickAccess.invalidate(),
  });

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
