import { trpc } from '@/trpc/client';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation } from '@tanstack/react-query';

export interface RemoveParticipant {
  chatId: string;
  participantId: string;
}

export const useRemoveParticipants = (): UseMutationResult<
  { success: boolean },
  Error,
  RemoveParticipant,
  void
> => {
  const trpcUtils = trpc.useUtils();

  return useMutation({
    mutationFn: () => new Promise((resolve) => resolve({ success: true })), // TODO: Replace with actual API call to add participants
    onSuccess: async (_, { chatId }) => {
      await trpcUtils.chat.chatDetails.invalidate({ chatId });
    },
  });
};
