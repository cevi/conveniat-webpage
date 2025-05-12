import { useMutation, type UseMutationResult, useQueryClient } from '@tanstack/react-query';

interface UpdateChatParameters {
  chatId: string;
  name: string;
}

export const useUpdateChat = (): UseMutationResult<
  { success: boolean },
  Error,
  UpdateChatParameters,
  { success: boolean }
> => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ chatId, name }: UpdateChatParameters) => {
      // In a real app, this would be an API call
      // For demo purposes, we'll just simulate a successful update
      await new Promise((resolve) => setTimeout(resolve, 500));
      return { success: true };
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['chat', variables.chatId] }).catch(console.error);
    },
  });
};
