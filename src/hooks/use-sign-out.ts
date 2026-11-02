'use client';

import { onlineStatusStore } from '@/hooks/use-online-status';
import { useReleasePushSubscriptions } from '@/hooks/use-release-push-subscriptions';
import { flushPersonalData } from '@/lib/flush-personal-data';
import { PERSISTER_THROTTLE_MS } from '@/trpc/query-persistence';
import type { StaticTranslationString } from '@/types/types';
import { useQueryClient } from '@tanstack/react-query';
import { signOut } from 'next-auth/react';
import { useCallback } from 'react';

/** Shown when a sign out could not reach the server, so the person is still signed in. */
export const signOutNeedsConnectionText: StaticTranslationString = {
  de: 'Abmelden geht nur mit Verbindung. Du bist noch angemeldet, versuche es wieder, sobald du online bist.',
  en: 'Logging out needs a connection. You are still logged in, try again once you are online.',
  fr: 'La déconnexion nécessite une connexion. Tu es toujours connecté·e, réessaie dès que tu es en ligne.',
};

/**
 * Returns a function that signs the user out and then drops everything cached for them. The
 * caller decides where to go next.
 *
 * The session cookie is `httpOnly`, so only the server's answer to the sign out removes it.
 * Without a connection the function rejects and leaves everything as it was: wiping the data
 * of someone who stays signed in would show them as logged out until the cookie brings the
 * session back with the next request, which is worse on a shared phone than an honest error.
 * When the app already knows it is offline it does not try at all, because on wifi without an
 * uplink the sign out request would hang instead of failing.
 *
 * The in-memory cache is cleared as well, or the persister writes it straight back. Clearing
 * makes the persister write once per removed query, throttled: the first write still holds
 * most of the cache, the last one is empty. Waiting for that last write keeps the next account
 * from restoring this one's data.
 */
export function useSignOut(): () => Promise<void> {
  const releasePushSubscriptions = useReleasePushSubscriptions();
  const queryClient = useQueryClient();

  return useCallback(async (): Promise<void> => {
    if (!onlineStatusStore.getSnapshot()) {
      throw new Error('Signing out needs a connection');
    }
    await releasePushSubscriptions();
    await signOut({ redirect: false });
    queryClient.clear();
    await new Promise((resolve) => setTimeout(resolve, PERSISTER_THROTTLE_MS + 200));
    flushPersonalData({ clearCachedPages: true });
  }, [releasePushSubscriptions, queryClient]);
}
