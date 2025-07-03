import { sendMessage } from '@/features/chat/api/send-message';
import { useChatId } from '@/features/chat/context/chat-id-context';
import { useChatUser } from '@/features/chat/hooks/use-chat-user';
import { CHAT_DETAIL_QUERY_KEY } from '@/features/chat/hooks/use-chats';
import type { MessageDto, SendMessageDto } from '@/features/chat/types/api-dto-types';
import { MessageStatusDto } from '@/features/chat/types/api-dto-types';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

interface ChatDetailData {
  id: string;
  messages: MessageDto[];
}

/**
 * Custom hook to send a message in a chat.
 * It uses optimistic updates to provide immediate feedback to the user.
 *
 */
export const useMessageSend = (): UseMutationResult<
  void,
  Error,
  string,
  { previousChatData: ChatDetailData | undefined }
> => {
  const queryClient = useQueryClient();
  const chatId = useChatId();
  const chatQueryKey = CHAT_DETAIL_QUERY_KEY(chatId);
  const { data: currentUser } = useChatUser();

  return useMutation({
    mutationFn: async (content: string) => {
      const messagePayload: SendMessageDto = {
        chatId: chatId,
        content: content.trim(),
        timestamp: new Date(),
      };
      return sendMessage(messagePayload);
    },

    onSuccess: () => queryClient.invalidateQueries({ queryKey: chatQueryKey }),

    onMutate: async (content: string) => {
      // we cannot send without a current user
      if (currentUser === undefined) throw new Error('Current user is not defined');

      await queryClient.cancelQueries({ queryKey: chatQueryKey });

      const previousChatData = queryClient.getQueryData<ChatDetailData>(chatQueryKey);
      const temporaryId = `optimistic-${Date.now()}-${Math.random()}`;
      const createdMessage: MessageDto = {
        id: temporaryId,
        content: content.trim(),
        timestamp: new Date(),
        senderId: currentUser,
        status: MessageStatusDto.CREATED,
      };

      queryClient.setQueryData<ChatDetailData>(chatQueryKey, (oldData) => {
        if (!oldData) {
          console.warn('Attempted optimistic update on non-cached chat data.');
          return (
            previousChatData ?? {
              id: chatId,
              messages: [createdMessage],
            }
          );
        }

        return {
          ...oldData,
          messages: [...oldData.messages, createdMessage],
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
