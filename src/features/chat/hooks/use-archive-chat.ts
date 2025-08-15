import { trpc } from '@/trpc/client';

export const useArchiveChat = (): ReturnType<typeof trpc.chat.archiveChat.useMutation> => {
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

      return { previousChatDetails };
    },

    onSuccess: (_, { chatUuid }) => {
      console.log(`Chat ${chatUuid} archived successfully, invalidating chat detail query.`);
      trpcUtils.chat.chatDetails.invalidate({ chatId: chatUuid }).catch(console.error);
      trpcUtils.chat.chats.invalidate().catch(console.error);
    },

    onError: (error, { chatUuid }, context) => {
      console.error('Failed to archive chat:', error);

      // If the mutation fails, use the context to roll back to the previous value
      if (context?.previousChatDetails) {
        trpcUtils.chat.chatDetails.setData({ chatId: chatUuid }, context.previousChatDetails);
      }
    },
  });
};
