import { renameChat } from '@/features/chat/api/rename-chat';
import { CHAT_DETAIL_QUERY_KEY } from '@/features/chat/hooks/use-chats';
import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

interface UpdateChatParameters {
  chatId: string;
  name: string;
}

export const useUpdateChat = (): UseMutationResult<
  { success: boolean },
  Error,
  UpdateChatParameters,
  void
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chatId, name }: UpdateChatParameters) => {
      return renameChat(chatId, name);
    },
    onSuccess: (_, { chatId }) => {
      queryClient
        .invalidateQueries({ queryKey: CHAT_DETAIL_QUERY_KEY(chatId) })
        .catch(console.error);
    },
  });
};
