import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { UseTRPCQueryResult } from '@trpc/react-query/shared';
import type { inferProcedureOutput } from '@trpc/server';
import { useEffect } from 'react';

type ChatsResult = UseTRPCQueryResult<
  inferProcedureOutput<AppRouter['chat']['chats']>,
  TRPCClientErrorLike<AppRouter>
>;

export const useChats = (): ChatsResult => {
  const trpcUtils = trpc.useUtils();
  const query = trpc.chat.chats.useQuery({}, { refetchInterval: 30_000 });

  useEffect(() => {
    const handleMessage = (): void => {
      console.log('Received message via service worker, updating state...');
      trpcUtils.chat.chats.invalidate().catch(console.error);
    };

    if (typeof navigator !== 'undefined') {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return (): void => {
      if (typeof navigator !== 'undefined') {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [trpcUtils]);

  return query;
};

type ChatDetailResult = UseTRPCQueryResult<
  inferProcedureOutput<AppRouter['chat']['chatDetails']>,
  TRPCClientErrorLike<AppRouter>
>;

export const useChatDetail = (chatId: string): ChatDetailResult => {
  const trpcUtils = trpc.useUtils();

  useEffect(() => {
    const handleMessage = (): void => {
      console.log('Received message via push notification, invalidating chat detail query');
      trpcUtils.chat.chatDetails.invalidate({ chatId }).catch(console.error);
    };

    if (typeof navigator !== 'undefined') {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return (): void => {
      if (typeof navigator !== 'undefined') {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [trpcUtils, chatId]);

  return trpc.chat.chatDetails.useQuery(
    { chatId },
    {
      enabled: chatId !== '',
      retry: 3,
      refetchInterval: 5000,
      refetchOnMount: true,
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
      refetchIntervalInBackground: false,
    },
  );
};
