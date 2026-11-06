'use client';
import { useServiceWorkerListener } from '@/hooks/use-service-worker-listener';
import { useTRPC } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { inferProcedureOutput } from '@trpc/server';
import { useCallback } from 'react';

import type { UseQueryResult, UseSuspenseQueryResult } from '@tanstack/react-query';
import { useQuery, useQueryClient, useSuspenseQuery } from '@tanstack/react-query';

interface PushBroadcast {
  /** Chat the forwarded push message belongs to, when it could be derived. */
  chatId: string | undefined;
}

/**
 * Extracts the notification broadcast the service worker forwards for incoming
 * Web Push messages (`{ type: 'notification', data: <push payload> }`).
 *
 * Returns `undefined` for every other service worker message (offline download
 * progress, PUSH_NAVIGATE, GET_CLIENT_URL, ...), so query invalidation only
 * runs for actual push messages.
 */
const parsePushBroadcast = (event: MessageEvent): PushBroadcast | undefined => {
  const eventData = event.data as { type?: string; data?: { data?: { url?: string } } } | undefined;
  if (eventData?.type !== 'notification') return undefined;

  const url = eventData.data?.data?.url;
  const chatId = typeof url === 'string' ? /\/app\/chat\/([^/?#]+)/.exec(url)?.[1] : undefined;
  return { chatId };
};

export const useChats = (): UseQueryResult<
  inferProcedureOutput<AppRouter['chat']['chats']>,
  TRPCClientErrorLike<AppRouter>
> => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const handleMessage = useCallback(
    (event: MessageEvent): void => {
      const broadcast = parsePushBroadcast(event);
      if (!broadcast) return;
      console.log(
        `[Chat][WebPush] Service worker forwarded a push message (chat: ${broadcast.chatId ?? 'unknown'}), refreshing chat list...`,
      );
      queryClient.invalidateQueries(trpc.chat.chats.pathFilter()).catch(console.error);
    },
    [queryClient, trpc],
  );

  useServiceWorkerListener(handleMessage);

  return useQuery(
    trpc.chat.chats.queryOptions(
      {},
      {
        // short stale time + refetch on mount: navigating to the chat overview
        // renders the persisted list right away and revalidates it in the
        // background, so the list is never both cached and permanently outdated
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 60 * 24 * 7,

        refetchOnMount: true,
        refetchOnWindowFocus: false,
        placeholderData: (previousData) => previousData,
      },
    ),
  );
};

/**
 * Refetches the queries backing an open chat view (message list + chat details)
 * when the service worker forwards a push message for that chat. This is the
 * fallback that keeps an open chat up to date when the SSE stream is not
 * delivering; the invalidation is a no-op refresh when SSE already injected
 * the message into the cache.
 */
const useRefetchChatOnPushBroadcast = (chatId: string): void => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const handleMessage = useCallback(
    (event: MessageEvent): void => {
      const broadcast = parsePushBroadcast(event);
      if (!broadcast) return;
      if (broadcast.chatId !== undefined && broadcast.chatId !== chatId) {
        console.log(
          `[Chat][WebPush] Forwarded push targets chat ${broadcast.chatId}, ignoring it for open chat ${chatId}.`,
        );
        return;
      }
      console.log(
        `[Chat][WebPush] Forwarded push for open chat ${chatId}, refetching messages and chat details...`,
      );
      queryClient
        .invalidateQueries(trpc.chat.chatDetails.queryFilter({ chatId }))
        .catch(console.error);
      queryClient
        .invalidateQueries(trpc.chat.infiniteMessages.infiniteQueryFilter({ chatId }))
        .catch(console.error);
    },
    [queryClient, trpc, chatId],
  );

  useServiceWorkerListener(handleMessage);
};

export const useChatDetail = (
  chatId: string,
): UseQueryResult<
  inferProcedureOutput<AppRouter['chat']['chatDetails']>,
  TRPCClientErrorLike<AppRouter>
> => {
  const trpc = useTRPC();
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

  useRefetchChatOnPushBroadcast(chatId);

  return useQuery(
    trpc.chat.chatDetails.queryOptions(
      { chatId },
      {
        enabled: chatId !== '',
        // see `useChats`: render the cached chat instantly, refresh in background
        staleTime: 1000 * 60,
        gcTime: 1000 * 60 * 60 * 24 * 7,

        refetchOnMount: true,
        refetchOnWindowFocus: false,
        refetchInterval: isOnline ? 300_000 : false,
        placeholderData: (previousData) => previousData,
        // NOT_FOUND means the user is not (or no longer) a member; retrying cannot change that
        // and would keep a removed member looking at the chat for several more seconds.
        retry: (failureCount, error) => error.data?.code !== 'NOT_FOUND' && failureCount < 3,
      },
    ),
  );
};

export const useSuspenseChatDetail = (
  chatId: string,
): UseSuspenseQueryResult<
  inferProcedureOutput<AppRouter['chat']['chatDetails']>,
  TRPCClientErrorLike<AppRouter>
> => {
  const trpc = useTRPC();
  useRefetchChatOnPushBroadcast(chatId);

  return useSuspenseQuery(
    trpc.chat.chatDetails.queryOptions(
      { chatId },
      {
        refetchInterval: 300_000,
        refetchOnMount: true,
        refetchOnWindowFocus: true,
        refetchOnReconnect: true,
        refetchIntervalInBackground: false,

        staleTime: 1000 * 60 * 5,
      },
    ),
  );
};
