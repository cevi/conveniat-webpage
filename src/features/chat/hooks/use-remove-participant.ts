import { CHAT_DETAIL_QUERY_KEY } from '@/features/chat/hooks/use-chats';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

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
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => ({ success: true }), // TODO: Replace with actual API call to add participants
    onSuccess: (_, { chatId }) => {
      queryClient
        .invalidateQueries({ queryKey: CHAT_DETAIL_QUERY_KEY(chatId) })
        .catch(console.error);
    },
  });
};
