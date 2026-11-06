import { toast } from '@/components/ui/toast';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { useTRPC } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { inferProcedureInput, inferProcedureOutput } from '@trpc/server';

import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

const archiveFailedText: StaticTranslationString = {
  de: 'Chat konnte nicht gelöscht werden.',
  en: 'The chat could not be deleted.',
  fr: "Le chat n'a pas pu être supprimé.",
};

const tryAgainText: StaticTranslationString = {
  de: 'Nochmals',
  en: 'Try again',
  fr: 'Réessayer',
};

type UseArchiveChatMutation = UseMutationResult<
  inferProcedureOutput<AppRouter['chat']['archiveChat']>,
  TRPCClientErrorLike<AppRouter>,
  inferProcedureInput<AppRouter['chat']['archiveChat']>,
  unknown
>;

/**
 * Archives a chat, taking it out of the list at once. If the server refuses, the chat comes back
 * and a toast says so, with a way to send it again: the delete is only sent once its undo has run
 * out, so without the toast the chat would reappear long after the user deleted it, unexplained.
 */
export const useArchiveChatMutation = (): UseArchiveChatMutation => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const mutation = useMutation(
    trpc.chat.archiveChat.mutationOptions({
      async onMutate({ chatUuid }) {
        await queryClient.cancelQueries(trpc.chat.chatDetails.queryFilter({ chatId: chatUuid }));

        // Optimistically update the chat details to mark it as archived
        const previousChatDetails = queryClient.getQueryData(
          trpc.chat.chatDetails.queryKey({ chatId: chatUuid }),
        );
        queryClient.setQueryData(
          trpc.chat.chatDetails.queryKey({ chatId: chatUuid }),
          (oldDate) => {
            if (!oldDate) return oldDate;
            return {
              ...oldDate,
              isArchived: true,
            };
          },
        );

        // Optimistically update the chat list to remove the archived chat
        const previousChats = queryClient.getQueryData(trpc.chat.chats.queryKey({}));
        queryClient.setQueryData(trpc.chat.chats.queryKey({}), (oldChats) => {
          if (!oldChats) return oldChats;
          return oldChats.filter((chat) => chat.id !== chatUuid);
        });

        return { previousChatDetails, previousChats };
      },

      onSuccess: (_, { chatUuid }) => {
        console.log(`Chat ${chatUuid} archived successfully, invalidating chat detail query.`);
        queryClient
          .invalidateQueries(trpc.chat.chatDetails.queryFilter({ chatId: chatUuid }))
          .catch(console.error);
        queryClient.invalidateQueries(trpc.chat.chats.pathFilter()).catch(console.error);
      },

      onError: (error, input, context) => {
        const { chatUuid } = input;
        console.error('Failed to archive chat:', error);

        // Roll back the chat details to the previous stateD
        if (context?.previousChatDetails) {
          queryClient.setQueryData(
            trpc.chat.chatDetails.queryKey({ chatId: chatUuid }),
            context.previousChatDetails,
          );
        }

        // Roll back the chat list to the previous state
        if (context?.previousChats) {
          queryClient.setQueryData(trpc.chat.chats.queryKey({}), context.previousChats);
        }

        toast.error(archiveFailedText[locale], {
          action: { label: tryAgainText[locale], onClick: () => mutation.mutate(input) },
        });
      },
    }),
  );

  return mutation;
};
