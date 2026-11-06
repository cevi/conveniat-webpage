'use client';
import { CHAT_PAGE_SIZE } from '@/features/chat/constants';
import {
  applyDeletionToChatList,
  applyDeletionToMessages,
  asDeletedMessage,
} from '@/features/chat/utils/message-deletion';
import { useTRPC } from '@/trpc/client';

import type { RouterInputs, RouterOutputs, TrpcError, TrpcQueries } from '@/trpc/client';
import type { UseMutationResult } from '@tanstack/react-query';
import { useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Turns a message into its deleted form in every cache that holds it: the conversation or
 * the thread it is in, the conversation once more for quotes of it, the single message read
 * by a thread root or a quote, the chat details and the preview in the chat list. Applying it
 * twice changes nothing, since the sender hears their own deletion on the stream as well.
 */
export const applyMessageDeletion = (
  { trpc, queryClient }: TrpcQueries,
  deletion: { chatId: string; messageId: string; parentId?: string | undefined; deletedAt: Date },
): void => {
  const { chatId, messageId, parentId, deletedAt } = deletion;
  const lists = new Set<string | undefined>([undefined, parentId]);
  for (const listParentId of lists) {
    queryClient.setQueryData(
      trpc.chat.infiniteMessages.infiniteQueryKey({
        chatId,
        limit: CHAT_PAGE_SIZE,
        parentId: listParentId,
      }),
      (old) => {
        if (!old) return old;
        const pages = old.pages.map((page) => {
          const items = applyDeletionToMessages(page.items, messageId, deletedAt);
          return items === page.items ? page : { ...page, items };
        });
        return pages.some((page, index) => page !== old.pages[index]) ? { ...old, pages } : old;
      },
    );
  }

  queryClient.setQueryData(trpc.chat.getMessage.queryKey({ messageId }), (old) =>
    old === undefined ? old : asDeletedMessage(old, deletedAt),
  );

  queryClient.setQueryData(trpc.chat.chatDetails.queryKey({ chatId }), (old) => {
    if (!old) return old;
    const messages = applyDeletionToMessages(old.messages, messageId, deletedAt);
    return messages === old.messages ? old : { ...old, messages };
  });

  const chats = queryClient.getQueryData(trpc.chat.chats.queryKey({}));
  if (chats !== undefined) {
    const patched = applyDeletionToChatList(chats, chatId, messageId);
    if (patched !== chats) queryClient.setQueryData(trpc.chat.chats.queryKey({}), patched);
    // a deleted message no longer counts as unread, and only the server knows whether it did
    if ((chats.find((chat) => chat.id === chatId)?.unreadCount ?? 0) > 0) {
      queryClient.invalidateQueries(trpc.chat.chats.pathFilter()).catch(console.error);
    }
  }
};

/**
 * Deletes one of the user's own messages for everyone, see `deleteMessage`. Not optimistic:
 * it cannot be undone, so the bubble changes once the server has confirmed it.
 *
 * @param message - the message the sheet was opened on, for the caches to patch
 */
export const useDeleteMessage = (message: {
  chatId: string;
  parentId?: string | undefined;
}): UseMutationResult<
  RouterOutputs['chat']['deleteMessage'],
  TrpcError,
  RouterInputs['chat']['deleteMessage']
> => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  return useMutation(
    trpc.chat.deleteMessage.mutationOptions({
      retry: false,
      onSuccess: ({ deletedAt }, { messageId }) => {
        applyMessageDeletion(
          { trpc, queryClient },
          {
            chatId: message.chatId,
            messageId,
            parentId: message.parentId,
            deletedAt: new Date(deletedAt),
          },
        );
      },
    }),
  );
};
