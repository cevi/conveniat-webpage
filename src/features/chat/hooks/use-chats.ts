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

  // ensures that we refresh the chats overview on mount
  return trpc.chat.chats.useQuery({}, { refetchOnMount: 'always' });
};

export const useChatDetail = (
  chatId: string,
): UseTRPCQueryResult<
  inferProcedureOutput<AppRouter['chat']['chatDetails']>,
  TRPCClientErrorLike<AppRouter>
> => {
  const trpcUtils = trpc.useUtils();

  const handleMessage = useCallback((): void => {
    console.log('Received message via push notification, invalidating chat detail query');
    trpcUtils.chat.chatDetails.invalidate({ chatId }).catch(console.error);
  }, [trpcUtils, chatId]);

  useServiceWorkerListener(handleMessage);

  return trpc.chat.chatDetails.useQuery(
    { chatId },
    {
      enabled: chatId !== '',
      refetchInterval: 60_000,
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
      refetchInterval: 60_000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchIntervalInBackground: false,
    },
  );
};
