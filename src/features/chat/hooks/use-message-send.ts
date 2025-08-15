import type { ChatDetails } from '@/features/chat/api/queries/chat';
import type { MessageDto } from '@/features/chat/types/api-dto-types';
import { MessageStatusDto } from '@/features/chat/types/api-dto-types';
import { trpc } from '@/trpc/client';

export const useMessageSend = (): ReturnType<typeof trpc.chat.sendMessage.useMutation> => {
  const trpcUtils = trpc.useUtils();
  const { data: currentUser } = trpc.chat.user.useQuery({});

  return trpc.chat.sendMessage.useMutation({
    async onMutate({ chatId, content }) {
      if (!Boolean(currentUser)) {
        throw new Error('Current user is not defined');
      }

      await trpcUtils.chat.chatDetails.cancel({ chatId });
      const previousChatData = trpcUtils.chat.chatDetails.getData({ chatId });

      const optimisticMessage: MessageDto = {
        id: `optimistic-${Date.now()}`,
        content: content.trim(),
        timestamp: new Date(),
        senderId: currentUser,
        status: MessageStatusDto.CREATED,
      };

      trpcUtils.chat.chatDetails.setData(
        { chatId },
        (oldData: ChatDetails | undefined): ChatDetails => {
          if (!oldData) {
            return {
              isArchived: false,
              name: '',
              participants: [],
              id: chatId,
              messages: [optimisticMessage],
            };
          }
          return {
            ...oldData,
            messages: [...oldData.messages, optimisticMessage],
          };
        },
      );

      return { previousChatData };
    },

    onError: (error, { chatId }, context) => {
      // TODO: use proper error handling and user feedback
      console.error('Failed to send message, rolling back optimistic update:', error);
      if (context?.previousChatData) {
        trpcUtils.chat.chatDetails.setData({ chatId }, context.previousChatData);
      } else {
        trpcUtils.chat.chatDetails.invalidate({ chatId }).catch(console.error);
      }
    },

    onSuccess: (_, { chatId }) => {
      trpcUtils.chat.chatDetails.invalidate({ chatId }).catch(console.error);
    },
  });
};
