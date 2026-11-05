import { toast } from '@/components/ui/toast';
import { useCurrentLocale } from '@/hooks/use-current-locale';
import { trpc } from '@/trpc/client';
import type { AppRouter } from '@/trpc/routers/_app';
import type { Locale, StaticTranslationString } from '@/types/types';
import { i18nConfig } from '@/types/types';
import type { TRPCClientErrorLike } from '@trpc/client';
import type { UseTRPCMutationResult } from '@trpc/react-query/shared';
import type { inferProcedureInput, inferProcedureOutput } from '@trpc/server';

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

type UseArchiveChatMutation = UseTRPCMutationResult<
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
  const trpcUtils = trpc.useUtils();
  const locale = useCurrentLocale(i18nConfig) as Locale;

  const mutation = trpc.chat.archiveChat.useMutation({
    async onMutate({ chatUuid }) {
      await trpcUtils.chat.chatDetails.cancel({ chatId: chatUuid });

      // Optimistically update the chat details to mark it as archived
      const previousChatDetails = trpcUtils.chat.chatDetails.getData({ chatId: chatUuid });
      trpcUtils.chat.chatDetails.setData({ chatId: chatUuid }, (oldDate) => {
        if (!oldDate) return oldDate;
        return {
          ...oldDate,
          isArchived: true,
        };
      });

      // Optimistically update the chat list to remove the archived chat
      const previousChats = trpcUtils.chat.chats.getData({});
      trpcUtils.chat.chats.setData({}, (oldChats) => {
        if (!oldChats) return oldChats;
        return oldChats.filter((chat) => chat.id !== chatUuid);
      });

      return { previousChatDetails, previousChats };
    },

    onSuccess: (_, { chatUuid }) => {
      console.log(`Chat ${chatUuid} archived successfully, invalidating chat detail query.`);
      trpcUtils.chat.chatDetails.invalidate({ chatId: chatUuid }).catch(console.error);
      trpcUtils.chat.chats.invalidate().catch(console.error);
    },

    onError: (error, input, context) => {
      const { chatUuid } = input;
      console.error('Failed to archive chat:', error);

      // Roll back the chat details to the previous stateD
      if (context?.previousChatDetails) {
        trpcUtils.chat.chatDetails.setData({ chatId: chatUuid }, context.previousChatDetails);
      }

      // Roll back the chat list to the previous state
      if (context?.previousChats) {
        trpcUtils.chat.chats.setData({}, context.previousChats);
      }

      toast.error(archiveFailedText[locale], {
        action: { label: tryAgainText[locale], onClick: () => mutation.mutate(input) },
      });
    },
  });

  return mutation;
};
