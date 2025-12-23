import { trpc } from '@/trpc/client';

export interface AddParticipants {
  chatId: string;
  participantIds: string[];
}

export const useAddParticipants = (): ReturnType<
  typeof trpc.chat.addParticipants.useMutation
> => {
  const trpcUtils = trpc.useUtils();

  return trpc.chat.addParticipants.useMutation({
    onSuccess: async (_, { chatId }) => {
      await trpcUtils.chat.chatDetails.invalidate({ chatId });
    },
  });
};
