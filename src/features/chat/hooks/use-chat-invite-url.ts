'use client';

import { environmentVariables } from '@/config/environment-variables';
import { CHAT_INVITE_REFRESH_MS } from '@/features/chat/constants';
import { trpc } from '@/trpc/client';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

/**
 * The link behind the QR code the user shows to start a chat with them.
 *
 * Each code opens a single chat, so every mount mints a new one: mount it with the dialog
 * that shows the code. `gcTime: 0` drops the code when the dialog closes, which keeps a
 * reopened dialog from flashing the code someone already scanned.
 */
export const useChatInviteUrl = (): UseQueryResult<string> => {
  const { client } = trpc.useUtils();

  return useQuery({
    queryKey: ['chatInviteUrl'],
    meta: { persist: false },
    queryFn: async (): Promise<string> => {
      const { token } = await client.chat.createChatInvite.mutate({});
      const host = environmentVariables.NEXT_PUBLIC_ENABLE_CON27_SHORT_URLS
        ? 'https://con27.ch'
        : environmentVariables.NEXT_PUBLIC_APP_HOST_URL;
      return `${host}/app/chat/new-chat-with-user/${token}`;
    },
    gcTime: 0,
    staleTime: CHAT_INVITE_REFRESH_MS,
    refetchInterval: CHAT_INVITE_REFRESH_MS,
    refetchOnWindowFocus: false,
    retry: 1,
  });
};
