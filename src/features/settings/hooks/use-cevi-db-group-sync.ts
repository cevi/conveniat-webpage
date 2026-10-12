'use client';

import { trpc } from '@/trpc/client';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export type CeviDatabaseGroupSyncState = 'idle' | 'syncing' | 'synced' | 'failed';

interface CeviDatabaseGroupSync {
  state: CeviDatabaseGroupSyncState;
  sync: () => Promise<void>;
}

/**
 * Has the session read the user's groups from Cevi.DB now instead of at its next token refresh,
 * then reloads what the page and the query cache hold, since both were built on the old groups.
 *
 * It goes through the Auth.js session update rather than tRPC, because the groups live in the
 * session cookie and only that endpoint re-signs it.
 */
export const useCeviDatabaseGroupSync = (): CeviDatabaseGroupSync => {
  const { data: session, update } = useSession();
  const router = useRouter();
  const utils = trpc.useUtils();
  const [state, setState] = useState<CeviDatabaseGroupSyncState>('idle');

  const sync = async (): Promise<void> => {
    setState('syncing');
    const syncedBefore = session?.user.groups_synced_at;
    // Undefined while another update is running, null when the request failed or the session
    // has ended. A session that was synced a moment ago, or that could not reach Cevi.DB,
    // comes back with the time it already had.
    const updated = await update({});
    const syncedNow = updated?.user.groups_synced_at;

    if (syncedNow === undefined || syncedNow === syncedBefore) {
      setState('failed');
      // Shows the login again in case the session has ended.
      if (updated === null) router.refresh();
      return;
    }

    setState('synced');
    void utils.invalidate();
    router.refresh();
  };

  return { state, sync };
};
