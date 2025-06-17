import { onlinePing } from '@/features/chat/api/online-ping';
import { useMutation, type UseMutationResult } from '@tanstack/react-query';

export const useOnlinePing = (): UseMutationResult<void, Error, object, void> => {
  return useMutation({
    mutationFn: async () => onlinePing(),
  });
};
