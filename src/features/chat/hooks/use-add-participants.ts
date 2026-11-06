import { useTRPC } from '@/trpc/client';

import type { RouterInputs, RouterOutputs, TrpcError } from '@/trpc/client';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export interface AddParticipants {
  chatId: string;
  participantIds: string[];
}

export const useAddParticipants = (): UseMutationResult<
  RouterOutputs['chat']['addParticipants'],
  TrpcError,
  RouterInputs['chat']['addParticipants']
> => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.chat.addParticipants.mutationOptions({
      onSuccess: async (_, { chatId }) => {
        await queryClient.invalidateQueries(trpc.chat.chatDetails.queryFilter({ chatId }));
      },
    }),
  );
};
