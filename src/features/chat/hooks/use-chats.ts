'use client';

import { useServiceWorkerListener } from '@/hooks/use-service-worker-listener';
import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { UseTRPCQueryResult, UseTRPCSuspenseQueryResult } from '@trpc/react-query/shared';
import type { inferProcedureOutput } from '@trpc/server';
import { useCallback } from 'react';

export const useChats = (): UseTRPCQueryResult<
  inferProcedureOutput<AppRouter['chat']['chats']>,
  TRPCClientErrorLike<AppRouter>
> => {
  const trpcUtils = trpc.useUtils();

  const handleMessage = useCallback((): void => {
    console.log('Received message via service worker, updating chats...');
    trpcUtils.chat.chats.invalidate().catch(console.error);
  }, [trpcUtils]);

  useServiceWorkerListener(handleMessage);

  return trpc.chat.chats.useQuery(
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
  );
};

export const useChatDetail = (
  chatId: string,
): UseTRPCQueryResult<
  inferProcedureOutput<AppRouter['chat']['chatDetails']>,
  TRPCClientErrorLike<AppRouter>
> => {
  const trpcUtils = trpc.useUtils();
  const isOnline = typeof navigator === 'undefined' ? true : navigator.onLine;

  const handleMessage = useCallback((): void => {
    console.log('Received message via push notification, invalidating chat detail query');
    trpcUtils.chat.chatDetails.invalidate({ chatId }).catch(console.error);
  }, [trpcUtils, chatId]);

  useServiceWorkerListener(handleMessage);

  return trpc.chat.chatDetails.useQuery(
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
    },
  );
};

export const useSuspenseChatDetail = (
  chatId: string,
): UseTRPCSuspenseQueryResult<
  inferProcedureOutput<AppRouter['chat']['chatDetails']>,
  TRPCClientErrorLike<AppRouter>
> => {
  const trpcUtils = trpc.useUtils();

  const handleMessage = useCallback((): void => {
    console.log('Received message via push notification, invalidating chat detail query');
    trpcUtils.chat.chatDetails.invalidate({ chatId }).catch(console.error);
  }, [trpcUtils, chatId]);

  useServiceWorkerListener(handleMessage);

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
