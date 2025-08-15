import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { UseTRPCMutationResult } from '@trpc/react-query/shared';
import type { inferProcedureInput, inferProcedureOutput } from '@trpc/server';

type UseArchiveChatMutation = UseTRPCMutationResult<
  inferProcedureOutput<AppRouter['chat']['archiveChat']>,
  TRPCClientErrorLike<AppRouter>,
  inferProcedureInput<AppRouter['chat']['archiveChat']>,
  unknown
>;
export const useArchiveChatMutation = (): UseArchiveChatMutation => {
  const trpcUtils = trpc.useUtils();

  return trpc.chat.archiveChat.useMutation({
    async onMutate({ chatUuid }) {
      await trpcUtils.chat.chatDetails.cancel({ chatId: chatUuid });

      // Optimistically update the chat details to mark it as archived
      const previousChatDetails = trpcUtils.chat.chatDetails.getData({ chatId: chatUuid });
      trpcUtils.chat.chatDetails.setData({ chatId: chatUuid }, (oldDate) => {
        if (!oldDate) return oldDate;
        return {
          ...oldDate,
          isArchived: true,
        };
      });

      // Optimistically update the chat list to remove the archived chat
      const previousChats = trpcUtils.chat.chats.getData({});
      trpcUtils.chat.chats.setData({}, (oldChats) => {
        if (!oldChats) return oldChats;
        return oldChats.filter((chat) => chat.id !== chatUuid);
      });

      return { previousChatDetails, previousChats };
    },

    onSuccess: (_, { chatUuid }) => {
      console.log(`Chat ${chatUuid} archived successfully, invalidating chat detail query.`);
      trpcUtils.chat.chatDetails.invalidate({ chatId: chatUuid }).catch(console.error);
      trpcUtils.chat.chats.invalidate().catch(console.error);
    },

    onError: (error, { chatUuid }, context) => {
      console.error('Failed to archive chat:', error);
      console.dir({
        chatUuid,
        context,
      });

      // Roll back the chat details to the previous stateD
      if (context?.previousChatDetails) {
        trpcUtils.chat.chatDetails.setData({ chatId: chatUuid }, context.previousChatDetails);
      }

      // Roll back the chat list to the previous state
      if (context?.previousChats) {
        trpcUtils.chat.chats.setData({}, context.previousChats);
      }
    },
  });
};
