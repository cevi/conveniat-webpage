'use client';
import type { ChatMessage } from '@/features/chat/api/types';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import type { RouterInputs, RouterOutputs, TrpcError, TrpcQueries } from '@/trpc/client';
import { useTRPC } from '@/trpc/client';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/** The message with a new text, as the server stores it: the rest of the payload stays. */
const withText = (message: ChatMessage, text: string, editedAt: Date): ChatMessage => {
  const payload: unknown = message.messagePayload;
  const record =
    typeof payload === 'object' && payload !== null && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : {};
  return {
    ...message,
    messagePayload: { ...record, text },
    editedAt,
  };
};

/**
 * Replaces one message in the conversation or thread it is in and in its single-message cache,
 * the one a quote or a thread root reads. Returns the message as it was, for a rollback.
 */
const replaceCachedMessage = (
  { trpc, queryClient }: TrpcQueries,
  { chatId, parentId }: { chatId: string; parentId: string | undefined },
  messageId: string,
  replace: (message: ChatMessage) => ChatMessage,
): ChatMessage | undefined => {
  // assigned inside the updaters, which run synchronously
  const found: { previous?: ChatMessage } = {};
  queryClient.setQueryData(
    trpc.chat.infiniteMessages.infiniteQueryKey({ chatId, limit: CHAT_PAGE_SIZE, parentId }),
    (old) => {
      if (!old) return old;
      const pages = old.pages.map((page) => {
        if (!page.items.some((item) => item.id === messageId)) return page;
        return {
          ...page,
          items: page.items.map((item) => {
            if (item.id !== messageId) return item;
            found.previous = item;
            return replace(item);
          }),
        };
      });
      return pages.some((page, index) => page !== old.pages[index]) ? { ...old, pages } : old;
    },
  );
  queryClient.setQueryData(trpc.chat.getMessage.queryKey({ messageId }), (old) => {
    if (old === undefined) return old;
    found.previous ??= old;
    return replace(old);
  });
  return found.previous;
};

/**
 * Changes the text of one of the user's own messages, see `editMessage`. Optimistic: the bubble
 * shows the new text and "Bearbeitet" at once, and goes back to what it said if the server
 * refuses. Not queued offline, because the 24 h window would make a late replay fail anyway.
 *
 * @param list - the conversation (`parentId` undefined) or the thread the message is in
 */
export const useEditMessage = (list: {
  chatId: string;
  parentId?: string | undefined;
}): UseMutationResult<
  RouterOutputs['chat']['editMessage'],
  TrpcError,
  RouterInputs['chat']['editMessage'],
  { previous: ChatMessage | undefined }
> => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const target = { chatId: list.chatId, parentId: list.parentId };
  return useMutation(
    trpc.chat.editMessage.mutationOptions({
      retry: false,
      onMutate: async ({ messageId, text }) => {
        await queryClient.cancelQueries(
          trpc.chat.infiniteMessages.infiniteQueryFilter({
            chatId: target.chatId,
            limit: CHAT_PAGE_SIZE,
            parentId: target.parentId,
          }),
        );
        const previous = replaceCachedMessage({ trpc, queryClient }, target, messageId, (message) =>
          withText(message, text, new Date()),
        );
        return { previous };
      },
      onError: (_error, { messageId }, context) => {
        const previous = context?.previous;
        if (previous === undefined) return;
        replaceCachedMessage({ trpc, queryClient }, target, messageId, () => previous);
      },
      onSuccess: ({ editedAt }, { messageId, text }) => {
        // the server's time, which the realtime refetch would bring anyway
        replaceCachedMessage({ trpc, queryClient }, target, messageId, (message) =>
          withText(message, text, new Date(editedAt)),
        );
      },
    }),
  );
};
