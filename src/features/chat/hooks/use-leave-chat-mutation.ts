import { useTRPC } from '@/trpc/client';
import { useRouter } from 'next/navigation';

import type { RouterInputs, RouterOutputs, TrpcError } from '@/trpc/client';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Leaves a group chat and returns to the chat overview. Not optimistic: leaving cannot be
 * undone by the user, so the chat stays until the server has confirmed it.
 */
export const useLeaveChatMutation = (): UseMutationResult<
  RouterOutputs['chat']['leaveChat'],
  TrpcError,
  RouterInputs['chat']['leaveChat']
> => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation(
    trpc.chat.leaveChat.mutationOptions({
      onSuccess: (_, { chatUuid }) => {
        queryClient.setQueryData(trpc.chat.chats.queryKey({}), (chats) =>
          chats?.filter((chat) => chat.id !== chatUuid),
        );
        queryClient.invalidateQueries(trpc.chat.chats.pathFilter()).catch(console.error);
        router.push('/app/chat');
      },
    }),
  );
};
