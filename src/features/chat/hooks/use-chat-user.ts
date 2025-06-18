import { fetchChatUser } from '@/features/chat/api/get-chat-user';
import type { UseQueryResult } from '@tanstack/react-query';
import { useQuery } from '@tanstack/react-query';

export const CHAT_USER_QUERY_KEY = ['chatUser'];

export const useChatUser = (): UseQueryResult<string> => {
  return useQuery({
    queryKey: CHAT_USER_QUERY_KEY,
    queryFn: fetchChatUser,
  });
};
