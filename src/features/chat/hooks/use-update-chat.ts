import { trpc } from '@/trpc/client';

export const useUpdateChat = (): ReturnType<typeof trpc.chat.renameChat.useMutation> => {
  const trpcUtils = trpc.useUtils();

  return trpc.chat.renameChat.useMutation({
    onSuccess: (_, { chatUuid }) => {
      console.log(`Chat ${chatUuid} renamed successfully, invalidating chat detail query.`);
      trpcUtils.chat.chatDetails.invalidate({ chatId: chatUuid }).catch(console.error);
    },
    onError: (error) => {
      console.error('Failed to rename chat:', error);
    },
  });
};
