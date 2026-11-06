import { useTRPC } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { inferProcedureInput, inferProcedureOutput } from '@trpc/server';

import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

type UseUpdateChatMutation = UseMutationResult<
  inferProcedureOutput<AppRouter['chat']['renameChat']>,
  TRPCClientErrorLike<AppRouter>,
  inferProcedureInput<AppRouter['chat']['renameChat']>,
  unknown
>;

export const useUpdateChatMutation = (): UseUpdateChatMutation => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.chat.renameChat.mutationOptions({
      onSuccess: (_, { chatUuid }) => {
        console.log(`Chat ${chatUuid} renamed successfully, invalidating chat detail query.`);
        queryClient
          .invalidateQueries(trpc.chat.chatDetails.queryFilter({ chatId: chatUuid }))
          .catch(console.error);
      },
      onError: (error) => {
        console.error('Failed to rename chat:', error);
      },
    }),
  );
};
