import { trpc } from '@/trpc/client';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';

export interface AddParticipants {
  chatId: string;
  participantIds: string[];
}

export const useAddParticipants = (): UseMutationResult<
  { success: boolean },
  Error,
  AddParticipants,
  void
> => {
  const trpcUtils = trpc.useUtils();

  return useMutation({
    // TODO: Replace with actual API call to add participants
    mutationFn: async () => new Promise((resolve) => resolve({ success: true })),
    onSuccess: async (_, { chatId }) => {
      await trpcUtils.chat.chatDetails.invalidate({ chatId });
    },
  });
};
