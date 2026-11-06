import { useTRPC } from '@/trpc/client';

import type { RouterInputs, RouterOutputs, TrpcError } from '@/trpc/client';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface RemoveParticipant {
  chatId: string;
  participantId: string;
}

export const useRemoveParticipants = (): UseMutationResult<
  RouterOutputs['chat']['removeParticipant'],
  TrpcError,
  RouterInputs['chat']['removeParticipant']
> => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.chat.removeParticipant.mutationOptions({
      onSuccess: async (_, { chatId }) => {
        await queryClient.invalidateQueries(trpc.chat.chatDetails.queryFilter({ chatId }));
      },
    }),
  );
};
