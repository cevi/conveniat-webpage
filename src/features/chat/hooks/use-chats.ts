import type { Contact } from '@/features/chat/api/get-contacts';
import { fetchAllContacts } from '@/features/chat/api/get-contacts';
import { getChatDetail, getChats } from '@/features/chat/api/get-messages';
import type { ChatDetailDto, ChatDto } from '@/features/chat/types/api-dto-types';
import { MessageStatusDto } from '@/features/chat/types/api-dto-types';

import { changeMessageStatus } from '@/features/chat/api/change-message-status';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

// --- Define Query Keys ---
export const CHATS_QUERY_KEY = ['chats'];
export const CHAT_DETAIL_QUERY_KEY = (chatId: string): string[] => ['chatDetail', chatId];
export const ALL_CONTACTS_QUERY_KEY = ['allContacts'];

// --- useChats Hook ---
export const useChats = (): UseQueryResult<ChatDto[]> => {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: CHATS_QUERY_KEY,
    queryFn: getChats,
    refetchInterval: 30_000, // 30 seconds
  });

  useEffect(() => {
    const handleMessage = (): void => {
      console.log('Received message via push notification, invalidating chats query');
      queryClient.invalidateQueries({ queryKey: CHATS_QUERY_KEY }).catch(console.error);
      changeMessageStatus({
        messageId: '', // TODO: Handle message ID properly
        status: MessageStatusDto.DELIVERED,
      }).catch(console.error);
    };

    if (typeof navigator !== 'undefined') {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return (): void => {
      if (typeof navigator !== 'undefined') {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [queryClient]);

  return query;
};

// --- useChatDetail Hook ---
export const useChatDetail = (chatId: string): UseQueryResult<ChatDetailDto> => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleMessage = (): void => {
      console.log('Received message via push notification, invalidating chat detail query');
      queryClient
        .invalidateQueries({ queryKey: CHAT_DETAIL_QUERY_KEY(chatId) })
        .catch(console.error);
    };

    if (typeof navigator !== 'undefined') {
      navigator.serviceWorker.addEventListener('message', handleMessage);
    }

    return (): void => {
      if (typeof navigator !== 'undefined') {
        navigator.serviceWorker.removeEventListener('message', handleMessage);
      }
    };
  }, [queryClient, chatId]);

  return useQuery({
    queryKey: CHAT_DETAIL_QUERY_KEY(chatId),
    queryFn: () =>
      getChatDetail(chatId).then((data) => {
        if ('error' in data) throw new Error('Failed to fetch chat detail');
        return data;
      }),
    enabled: chatId !== '',

    retry: 3, // Retry up to 3 times on failure

    refetchInterval: 5000, // 5 seconds
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,

    // for that we have push notifications
    refetchIntervalInBackground: false,
  });
};

// --- useAllContacts Hook ---
export const useAllContacts = (): UseQueryResult<Contact[]> => {
  return useQuery({
    queryKey: ALL_CONTACTS_QUERY_KEY,
    queryFn: fetchAllContacts,
  });
};
