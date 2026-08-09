'use client';

import { useServiceWorkerListener } from '@/hooks/use-service-worker-listener';
import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { UseTRPCQueryResult, UseTRPCSuspenseQueryResult } from '@trpc/react-query/shared';
import type { inferProcedureOutput } from '@trpc/server';
import { useCallback } from 'react';

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

export const useChats = (): UseTRPCQueryResult<
  inferProcedureOutput<AppRouter['chat']['chats']>,
  TRPCClientErrorLike<AppRouter>
> => {
  const trpcUtils = trpc.useUtils();

  const handleMessage = useCallback(
    (event: MessageEvent): void => {
      const broadcast = parsePushBroadcast(event);
      if (!broadcast) return;
      console.log(
        `[Chat][WebPush] Service worker forwarded a push message (chat: ${broadcast.chatId ?? 'unknown'}), refreshing chat list...`,
      );
      trpcUtils.chat.chats.invalidate().catch(console.error);
    },
    [trpcUtils],
  );

  useServiceWorkerListener(handleMessage);

  return trpc.chat.chats.useQuery(
    {},
    {
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24 * 7,

      refetchOnMount: false,
      refetchOnWindowFocus: false,
      placeholderData: (previousData) => previousData,
    },
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
  const trpcUtils = trpc.useUtils();

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
      trpcUtils.chat.chatDetails.invalidate({ chatId }).catch(console.error);
      trpcUtils.chat.infiniteMessages.invalidate({ chatId }).catch(console.error);
    },
    [trpcUtils, chatId],
  );

  useServiceWorkerListener(handleMessage);
};

export const useChatDetail = (
  chatId: string,
): UseTRPCQueryResult<
  inferProcedureOutput<AppRouter['chat']['chatDetails']>,
  TRPCClientErrorLike<AppRouter>
> => {
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

  useRefetchChatOnPushBroadcast(chatId);

  return trpc.chat.chatDetails.useQuery(
    { chatId },
    {
      enabled: chatId !== '',
      staleTime: 1000 * 60 * 5,
      gcTime: 1000 * 60 * 60 * 24 * 7,

      refetchOnMount: false,
      refetchOnWindowFocus: false,
      refetchInterval: isOnline ? 300_000 : false,
      placeholderData: (previousData) => previousData,
    },
  );
};

export const useSuspenseChatDetail = (
  chatId: string,
): UseTRPCSuspenseQueryResult<
  inferProcedureOutput<AppRouter['chat']['chatDetails']>,
  TRPCClientErrorLike<AppRouter>
> => {
  useRefetchChatOnPushBroadcast(chatId);

  return trpc.chat.chatDetails.useSuspenseQuery(
    { chatId },
    {
      refetchInterval: 300_000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchIntervalInBackground: false,

      staleTime: 1000 * 60 * 5,
    },
  );
};
