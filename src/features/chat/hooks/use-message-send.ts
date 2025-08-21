import type { ChatDetails, ChatMessage } from '@/features/chat/api/types';
import { MessageEventType } from '@/lib/prisma/client';
import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { UseTRPCMutationResult } from '@trpc/react-query/shared';
import type { inferProcedureInput, inferProcedureOutput } from '@trpc/server';

type UseMessageSendMutation = UseTRPCMutationResult<
  inferProcedureOutput<AppRouter['chat']['sendMessage']>,
  TRPCClientErrorLike<AppRouter>,
  inferProcedureInput<AppRouter['chat']['sendMessage']>,
  unknown
>;

export const useMessageSend = (): UseMessageSendMutation => {
  const trpcUtils = trpc.useUtils();
  const { data: currentUser } = trpc.chat.user.useQuery({});

  return trpc.chat.sendMessage.useMutation({
    async onMutate({ chatId, content }) {
      if (!Boolean(currentUser)) {
        throw new Error('Current user is not defined');
      }

      await trpcUtils.chat.chatDetails.cancel({ chatId });
      const previousChatData = trpcUtils.chat.chatDetails.getData({ chatId });

      const optimisticMessage: ChatMessage = {
        id: `optimistic-${Date.now()}`,
        messagePayload: content.trim(),
        createdAt: new Date(),
        senderId: currentUser,
        status: MessageEventType.CREATED,
      };

      // optimistically update the chat details
      trpcUtils.chat.chatDetails.setData(
        { chatId },
        (oldData: ChatDetails | undefined): ChatDetails => {
          if (!oldData) {
            return {
              // eslint-disable-next-line unicorn/no-null
              archivedAt: null,
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

      // optimistically update the chat overview
      trpcUtils.chat.chats.setData({}, (oldChats) => {
        if (!oldChats) return [];
        return oldChats.map((chat) => {
          if (chat.id === chatId) {
            return {
              ...chat,
              lastMessage: {
                id: optimisticMessage.id,
                senderId: optimisticMessage.senderId,
                messagePreview: optimisticMessage.messagePayload.toString(),
                createdAt: optimisticMessage.createdAt,
                status: optimisticMessage.status,
              },
              lastUpdate: optimisticMessage.createdAt,
              unreadCount: 0,
            };
          }
          return chat;
        });
      });

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
