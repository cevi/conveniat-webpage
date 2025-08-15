import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { UseTRPCMutationResult } from '@trpc/react-query/shared';
import type { inferProcedureInput, inferProcedureOutput } from '@trpc/server';

type UseUpdateChatMutation = UseTRPCMutationResult<
  inferProcedureOutput<AppRouter['chat']['renameChat']>,
  TRPCClientErrorLike<AppRouter>,
  inferProcedureInput<AppRouter['chat']['renameChat']>,
  unknown
>;

export const useUpdateChatMutation = (): UseUpdateChatMutation => {
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
