import { trpc } from '@/trpc/client';

export interface RemoveParticipant {
  chatId: string;
  participantId: string;
}

export const useRemoveParticipants = (): ReturnType<
  typeof trpc.chat.removeParticipant.useMutation
> => {
  const trpcUtils = trpc.useUtils();

  return trpc.chat.removeParticipant.useMutation({
    onSuccess: async (_, { chatId }) => {
      await trpcUtils.chat.chatDetails.invalidate({ chatId });
    },
  });
};
