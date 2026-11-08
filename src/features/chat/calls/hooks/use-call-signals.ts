'use client';

import { handleCallSignal, setCallTransport } from '@/features/chat/calls/call-engine';
import { subscribeToCallSignals } from '@/features/chat/hooks/use-chat-sse';
import { useTRPC, useTRPCClient } from '@/trpc/client';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Connects the call engine to the server: signals go out as tRPC calls, outside the query
 * cache and the offline outbox, because a signal replayed later would ring a call long over.
 * They come back in on the user's personal realtime channel.
 */
export const useCallSignals = (): void => {
  const trpc = useTRPC();
  const trpcClient = useTRPCClient();
  const { data: currentUser } = useQuery(trpc.chat.user.queryOptions({}));

  useEffect(() => {
    setCallTransport({
      send: async (signal) => {
        await trpcClient.chat.sendCallSignal.mutate(signal);
      },
      getIceServers: () => trpcClient.chat.getCallIceServers.query(),
    });
    return (): void => setCallTransport(undefined);
  }, [trpcClient]);

  useEffect(() => {
    if (typeof currentUser !== 'string' || currentUser === '') return;
    return subscribeToCallSignals(currentUser, (event) => {
      // the channel the server delivered it on is the user, whatever this tab remembers
      if (event.call !== undefined) handleCallSignal(event.call, event.channel ?? currentUser);
    });
  }, [currentUser]);

  usePendingCallPickup(currentUser, trpcClient);
};

/**
 * Rings a call that started while this device was not listening: the app opened from the
 * call's push, or back from the background, where the invite on the stream went by unseen.
 */
const usePendingCallPickup = (
  currentUser: string | undefined,
  trpcClient: ReturnType<typeof useTRPCClient>,
): void => {
  useEffect(() => {
    if (typeof currentUser !== 'string' || currentUser === '') return;
    const pickUp = (): void => {
      if (document.visibilityState !== 'visible') return;
      trpcClient.chat.getPendingCall
        .query()
        .then((invite) => {
          if (invite !== null) handleCallSignal(invite, currentUser);
        })
        .catch((error: unknown) => {
          console.warn('[Call] Looking for a ringing call failed:', error);
        });
    };
    pickUp();
    document.addEventListener('visibilitychange', pickUp);
    return (): void => document.removeEventListener('visibilitychange', pickUp);
  }, [currentUser, trpcClient]);
};
