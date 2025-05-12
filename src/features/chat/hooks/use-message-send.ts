import { sendMessage } from '@/features/chat/api/send-message';
import { useChatUser } from '@/features/chat/hooks/use-chat-user';
import { CHAT_DETAIL_QUERY_KEY } from '@/features/chat/hooks/use-chats';
import type { Message, OptimisticMessage } from '@/features/chat/types/chat';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ChatDetailData {
  id: string;
  messages: Message[];
}

/**
 * Custom hook to send a message in a chat.
 * It uses optimistic updates to provide immediate feedback to the user.
 *
 * @param chatId
 */
export const useMessageSend = (
  chatId: string,
): UseMutationResult<void, Error, string, { previousChatData: ChatDetailData | undefined }> => {
  const queryClient = useQueryClient();
  const chatQueryKey = CHAT_DETAIL_QUERY_KEY(chatId);
  const { data: currentUser } = useChatUser();
  return useMutation({
    mutationFn: async (content: string) => {
      const messagePayload = {
        chatId: chatId,
        content: content.trim(),
        timestamp: new Date(),
      };
      return sendMessage(messagePayload);
    },

    onMutate: async (content: string) => {
      await queryClient.cancelQueries({ queryKey: chatQueryKey });
      const previousChatData = queryClient.getQueryData<ChatDetailData>(chatQueryKey);
      const temporaryId = `optimistic-${Date.now()}-${Math.random()}`;
      const optimisticMessage: OptimisticMessage = {
        id: temporaryId,
        content: content.trim(),
        timestamp: new Date(),
        senderId: currentUser ?? '',
        isOptimistic: true,
      };

      queryClient.setQueryData<ChatDetailData>(chatQueryKey, (oldData) => {
        if (!oldData) {
          console.warn('Attempted optimistic update on non-cached chat data.');
          return (
            previousChatData ?? {
              id: chatId,
              messages: [optimisticMessage],
            }
          );
        }

        return {
          ...oldData,
          messages: [...oldData.messages, optimisticMessage],
        };
      });

      return { previousChatData };
    },

    onError: async (error, _content, context) => {
      console.error('Message send failed, rolling back optimistic update:', error);
      if (context?.previousChatData) {
        queryClient.setQueryData<ChatDetailData>(chatQueryKey, context.previousChatData);
      } else {
        await queryClient.invalidateQueries({ queryKey: chatQueryKey });
      }
    },

    onSettled: async () => {
      await queryClient.invalidateQueries({ queryKey: chatQueryKey });
    },
  });
};
